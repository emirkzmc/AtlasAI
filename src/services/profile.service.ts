import {
  getFirestore,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
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
    throw new Error("Profil fotoğrafı yüklenirken bir hata oluştu.");
  }
}
