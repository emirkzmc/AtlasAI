import {
  getFirestore,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getAuth,
  updateProfile,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "./firebase.config";
import { features } from "../config/features";

const db = getFirestore(app);
const storage = getStorage(app);

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_BYTES = 1 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Dosya okunamadı."));
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });
}

function validateProfileImage(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Yalnızca JPG, JPEG veya PNG dosyaları yükleyebilirsiniz.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Profil fotoğrafı en fazla 1 MB olabilir.");
  }
}

/**
 * Profil fotoğrafını yükler.
 * Storage kapalıysa Firestore `photoDataUrl` (base64) olarak saklar.
 */
export async function uploadProfilePhoto(uid: string, file: File): Promise<void> {
  validateProfileImage(file);

  const userRef = doc(db, "users", uid);
  const timestamp = serverTimestamp();

  try {
    if (features.enableStorage) {
      const ext = file.type === "image/png" ? "png" : "jpg";
      const storageRef = ref(storage, `users/${uid}/profile/avatar.${ext}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(userRef, {
        photoURL: url,
        photoUpdatedAt: timestamp,
        updatedAt: timestamp,
      });
    } else {
      const photoDataUrl = await readFileAsDataUrl(file);
      await updateDoc(userRef, {
        photoDataUrl,
        photoUpdatedAt: timestamp,
        updatedAt: timestamp,
      });
    }
  } catch (error: unknown) {
    console.error("[uploadProfilePhoto] Upload failed:", error);
    if (error instanceof Error) throw error;
    throw new Error("Profil fotoğrafı yüklenirken bir hata oluştu.", { cause: error });
  }
}

/**
 * Kullanıcı adını (Ad Soyad) günceller.
 * Hem Firestore belgesini hem de Firebase Auth profilini günceller.
 */
export async function updateDisplayName(uid: string, fullName: string): Promise<void> {
  const trimmed = fullName.trim();
  if (!trimmed) {
    throw new Error("Ad soyad boş olamaz.");
  }

  const parts = trimmed.split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : undefined;

  const userRef = doc(db, "users", uid);
  const timestamp = serverTimestamp();

  try {
    const firestoreUpdate: Record<string, unknown> = {
      fullName: trimmed,
      displayName: trimmed,
      firstName,
      updatedAt: timestamp,
    };
    if (lastName) {
      firestoreUpdate.lastName = lastName;
    }

    await updateDoc(userRef, firestoreUpdate);

    // Firebase Auth displayName güncelleme
    const auth = getAuth(app);
    const currentUser = auth.currentUser;
    if (currentUser) {
      await updateProfile(currentUser, { displayName: trimmed });
    }
  } catch (error: unknown) {
    console.error("[updateDisplayName] Update failed:", error);
    if (error instanceof Error) throw error;
    throw new Error("Ad soyad güncellenirken bir hata oluştu.", { cause: error });
  }
}

/**
 * Yeni e-posta adresine doğrulama e-postası gönderir.
 *
 * Akış:
 * 1. Mevcut şifre ile kullanıcıyı yeniden doğrular (re-authenticate)
 * 2. Firebase `verifyBeforeUpdateEmail` ile yeni adrese doğrulama gönderir
 * 3. Kullanıcı yeni adresindeki bağlantıya tıkladığında e-posta otomatik güncellenir
 */
export async function sendEmailChangeVerification(
  newEmail: string,
  currentPassword: string
): Promise<void> {
  const auth = getAuth(app);
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Oturum açık değil. Lütfen tekrar giriş yapın.");
  }

  if (!currentUser.email) {
    throw new Error("Mevcut e-posta adresi bulunamadı.");
  }

  const trimmed = newEmail.trim().toLowerCase();
  if (!trimmed) {
    throw new Error("E-posta adresi boş olamaz.");
  }

  if (!currentPassword) {
    throw new Error("Mevcut şifrenizi girmeniz gerekiyor.");
  }

  if (trimmed === currentUser.email.toLowerCase()) {
    throw new Error("Yeni e-posta mevcut e-posta ile aynı olamaz.");
  }

  try {
    // Hassas işlem öncesi yeniden doğrulama
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);

    // ActionCodeSettings — doğrulama sonrası yönlendirme URL'i
    const actionCodeSettings = {
      url: `${window.location.origin}/login`,
      handleCodeInApp: false,
    };

    await verifyBeforeUpdateEmail(currentUser, trimmed, actionCodeSettings);
  } catch (error: unknown) {
    console.error("[sendEmailChangeVerification] Error:", error);

    if (error && typeof error === "object" && "code" in error) {
      const code = (error as { code: string }).code;
      switch (code) {
        case "auth/email-already-in-use":
          throw new Error("Bu e-posta adresi zaten kullanılıyor.", { cause: error });
        case "auth/invalid-email":
          throw new Error("Geçersiz bir e-posta adresi girdiniz.", { cause: error });
        case "auth/wrong-password":
        case "auth/invalid-credential":
          throw new Error("Girdiğiniz şifre hatalı.", { cause: error });
        case "auth/too-many-requests":
          throw new Error("Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyin.", { cause: error });
        default:
          break;
      }
    }

    if (error instanceof Error) throw error;
    throw new Error("E-posta değişikliği sırasında bir hata oluştu.", { cause: error });
  }
}
