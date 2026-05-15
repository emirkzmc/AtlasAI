import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "./firebase.config";
import type {
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  UserRole,
} from "../types/auth.types";
import { features } from "../config/features";
import {
  ensureTodayActivityAndStreak,
  incrementLoginCount,
} from "./dashboard.service";

export function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    switch ((error as { code: string }).code) {
      case "auth/email-already-in-use":
        return "Bu e-posta adresi ile zaten bir hesap bulunuyor.";
      case "auth/invalid-email":
        return "Geçersiz bir e-posta adresi girdiniz.";
      case "auth/weak-password":
        return "Şifreniz çok zayıf. Lütfen daha güçlü bir şifre belirleyin (en az 6 karakter).";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "E-posta adresiniz veya şifreniz hatalı.";
      case "auth/too-many-requests":
        return "Çok fazla başarısız deneme yaptınız. Lütfen daha sonra tekrar deneyin.";
      case "auth/network-request-failed":
        return "Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.";
      case "auth/operation-not-allowed":
        return "Bu giriş yöntemi şu anda devre dışı bırakılmış.";
      case "auth/missing-email":
        return "Lütfen bir e-posta adresi giriniz.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Beklenmeyen bir hata oluştu.";
}

const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Splits a full name string into firstName and lastName.
 * firstName = first word, lastName = remaining words.
 */
function splitName(fullName?: string): { firstName?: string; lastName?: string } {
  if (!fullName?.trim()) return {};
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function calculateAge(birthDate?: string): number | undefined {
  if (!birthDate) return undefined;

  const [year, month, day] = birthDate.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  const today = new Date();
  let age = today.getFullYear() - year;
  const hasBirthdayPassed =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age >= 0 ? age : undefined;
}

/**
 * Sign in with email/password and fetch the user's role from Firestore.
 * Blocks login if email is not verified.
 * Auto-creates user document if missing.
 */
export async function loginWithEmail(
  credentials: LoginCredentials
): Promise<AuthUser> {
  let firebaseUserUid: string | null = null;

  try {
    const { user } = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );

    firebaseUserUid = user.uid;

    if (!user.emailVerified) {
      await signOut(auth);
      throw new Error("Lütfen önce e-posta adresinizi doğrulayın.");
    }

    let authUser = await getUserFromFirestore(user.uid);

    if (!authUser) {
      // User document missing - auto-create from Firebase Auth data
      console.error(
        `[loginWithEmail] User document missing for uid: ${user.uid}. Auto-creating...`
      );
      const email = user.email ?? credentials.email;
      const newUserData: {
        uid: string;
        email: string;
        role: UserRole;
        fullName?: string;
        activityLog: string[];
        createdAt: ReturnType<typeof serverTimestamp>;
      } = {
        uid: user.uid,
        email,
        role: "student",
        activityLog: [],
        createdAt: serverTimestamp(),
        ...(user.displayName ? { fullName: user.displayName } : {}),
      };
      await setDoc(doc(db, "users", user.uid), newUserData);
      authUser = {
        uid: user.uid,
        email,
        role: "student",
        createdAt: new Date(),
        fullName: user.displayName ?? undefined,
        activityLog: [],
      };
    }

    if (authUser.role === "teacher" && !features.enableTeacherFeatures) {
      await signOut(auth);
      throw new Error("Öğretmen işlemleri şu anda kullanılamaz.");
    }

    // Update backward-compat activityLog array, streak, and login count
    const today = new Date().toISOString().split("T")[0];
    try {
      await updateDoc(doc(db, "users", user.uid), {
        activityLog: arrayUnion(today),
      });
      await ensureTodayActivityAndStreak(user.uid);
      await incrementLoginCount(user.uid);
    } catch (activityError) {
      // Non-blocking: don't fail login if activity update fails
      console.error(
        "[loginWithEmail] Activity/streak update failed (non-blocking):",
        activityError
      );
    }

    if (!authUser.activityLog) authUser.activityLog = [];
    if (!authUser.activityLog.includes(today)) authUser.activityLog.push(today);

    return { ...authUser, emailVerified: true };
  } catch (error: unknown) {
    // Ensure user is signed out if login fails mid-way
    if (firebaseUserUid) {
      const isOurCustomError =
        error instanceof Error &&
        (error.message === "Lütfen önce e-posta adresinizi doğrulayın." ||
          error.message === "Öğretmen işlemleri şu anda kullanılamaz.");
      if (!isOurCustomError) {
        try {
          await signOut(auth);
        } catch {
          // ignore
        }
      }
    }

    const message = getAuthErrorMessage(error);
    console.error("[loginWithEmail] Login error:", error);
    throw new Error(message);
  }
}

/**
 * Create a new user with email/password, write profile to Firestore,
 * send verification email, then sign out immediately.
 */
export async function registerWithEmail(
  credentials: RegisterCredentials
): Promise<AuthUser> {
  try {
    const { user } = await createUserWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );

    const { firstName, lastName } = splitName(credentials.fullName);
    const displayNameValue = credentials.fullName?.trim() ?? "";

    const userData: Record<string, unknown> = {
      uid: user.uid,
      email: credentials.email,
      role: credentials.role,
      displayName: displayNameValue,
      activityLog: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (credentials.fullName) userData.fullName = credentials.fullName;
    if (firstName) userData.firstName = firstName;
    if (lastName) userData.lastName = lastName;
    if (credentials.birthDate) userData.birthDate = credentials.birthDate;

    await setDoc(doc(db, "users", user.uid), userData);

    // Set Firebase Auth displayName so currentUser.displayName is populated
    if (credentials.fullName) {
      await updateProfile(user, { displayName: credentials.fullName });
    }

    await sendEmailVerification(user);
    // Keep the user signed in so the email verification page can call
    // currentUser.reload() and sendEmailVerification() without re-auth.

    const authUser: AuthUser = {
      uid: user.uid,
      email: credentials.email,
      role: credentials.role,
      fullName: credentials.fullName,
      firstName,
      lastName,
      birthDate: credentials.birthDate,
      age: calculateAge(credentials.birthDate),
      createdAt: new Date(),
      emailVerified: false,
      activityLog: [],
    };

    return authUser;
  } catch (error: unknown) {
    const message = getAuthErrorMessage(error);
    console.error("[registerWithEmail] Registration error:", error);
    throw new Error(message);
  }
}

/**
 * Sign out the current user.
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: unknown) {
    console.error("[logoutUser] Sign-out error:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Çıkış sırasında beklenmeyen bir hata oluştu.");
  }
}

/**
 * Fetch a user document from Firestore by UID.
 */
export async function getUserFromFirestore(
  uid: string
): Promise<AuthUser | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));

    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data() as {
      uid: string;
      email: string;
      role: UserRole;
      createdAt: { toDate: () => Date } | null;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      displayName?: string;
      photoURL?: string;
      photoDataUrl?: string;
      birthDate?: string;
      activityLog?: string[];
    };

    return {
      uid: data.uid,
      email: data.email,
      role: data.role,
      createdAt: data.createdAt?.toDate() ?? new Date(),
      firstName: data.firstName,
      lastName: data.lastName,
      fullName: data.fullName,
      displayName: data.displayName,
      photoURL: data.photoURL,
      photoDataUrl: data.photoDataUrl,
      birthDate: data.birthDate,
      age: calculateAge(data.birthDate),
      activityLog: data.activityLog ?? [],
    };
  } catch (error: unknown) {
    console.error("[getUserFromFirestore] Error fetching user document:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Kullanıcı verisi alınırken hata oluştu.");
  }
}

/**
 * Resend verification email. Signs in temporarily, sends email, then signs out.
 */
export async function resendVerificationEmail(
  email: string,
  password: string
): Promise<void> {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    if (user.emailVerified) {
      await signOut(auth);
      throw new Error("Bu hesap zaten doğrulanmış.");
    }

    await sendEmailVerification(user);
    await signOut(auth);
  } catch (error: unknown) {
    const message = getAuthErrorMessage(error);
    console.error("[resendVerificationEmail] Error:", error);
    throw new Error(message);
  }
}

/**
 * Send a password reset email to the given address.
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: unknown) {
    const message = getAuthErrorMessage(error);
    console.error("[resetPassword] Error:", error);
    throw new Error(message);
  }
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 */
export function subscribeToAuthState(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}
