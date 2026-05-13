import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
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


function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Bu e-posta adresi ile zaten bir hesap bulunuyor.';
      case 'auth/invalid-email':
        return 'Geçersiz bir e-posta adresi girdiniz.';
      case 'auth/weak-password':
        return 'Şifreniz çok zayıf. Lütfen daha güçlü bir şifre belirleyin (en az 6 karakter).';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-posta adresiniz veya şifreniz hatalı.';
      case 'auth/too-many-requests':
        return 'Çok fazla başarısız deneme yaptınız. Lütfen daha sonra tekrar deneyin.';
      case 'auth/network-request-failed':
        return 'Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.';
      case 'auth/operation-not-allowed':
        return 'Bu giriş yöntemi şu anda devre dışı bırakılmış.';
    }
  }
  
  if (error instanceof Error) {
    // If it's a generic Firebase error message, we might still want to return it,
    // but without the "Firebase: " prefix if possible, though custom errors from our code are fine.
    return error.message;
  }
  
  return 'Beklenmeyen bir hata oluştu.';
}

const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Sign in with email/password and fetch the user's role from Firestore.
 * Blocks login if email is not verified.
 */
export async function loginWithEmail(
  credentials: LoginCredentials
): Promise<AuthUser> {
  try {
    const { user } = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );

    if (!user.emailVerified) {
      await signOut(auth);
      throw new Error("Lütfen önce e-posta adresinizi doğrulayın.");
    }

    const authUser = await getUserFromFirestore(user.uid);

    if (!authUser) {
      throw new Error("Kullanıcı verisi bulunamadı.");
    }

    if (authUser.role === "teacher" && !features.enableTeacherFeatures) {
      await signOut(auth);
      throw new Error("Öğretmen işlemleri şu anda kullanılamaz.");
    }

    // Update activity log for today
    const today = new Date().toISOString().split("T")[0];
    await updateDoc(doc(db, "users", user.uid), {
      activityLog: arrayUnion(today)
    });
    
    if (!authUser.activityLog) authUser.activityLog = [];
    if (!authUser.activityLog.includes(today)) authUser.activityLog.push(today);

    return authUser;
  } catch (error: unknown) {
    const message = getAuthErrorMessage(error);
    throw new Error(message, { cause: error });
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

    const userData: {
      uid: string;
      email: string;
      role: UserRole;
      fullName?: string;
      createdAt: ReturnType<typeof serverTimestamp>;
    } = {
      uid: user.uid,
      email: credentials.email,
      role: credentials.role,
      ...(credentials.fullName ? { fullName: credentials.fullName } : {}),
      activityLog: [],
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", user.uid), userData);

    await sendEmailVerification(user);

    const authUser: AuthUser = {
      uid: user.uid,
      email: credentials.email,
      role: credentials.role,
      fullName: credentials.fullName,
      createdAt: new Date(),
      activityLog: [],
    };

    await signOut(auth);

    return authUser;
  } catch (error: unknown) {
    const message = getAuthErrorMessage(error);
    throw new Error(message, { cause: error });
  }
}

/**
 * Sign out the current user.
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message, { cause: error });
    }
    throw new Error("Çıkış sırasında beklenmeyen bir hata oluştu.", { cause: error });
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
      fullName?: string;
      photoURL?: string;
      activityLog?: string[];
    };

    return {
      uid: data.uid,
      email: data.email,
      role: data.role,
      createdAt: data.createdAt?.toDate() ?? new Date(),
      fullName: data.fullName,
      photoURL: data.photoURL,
      activityLog: data.activityLog ?? [],
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message, { cause: error });
    }
    throw new Error("Kullanıcı verisi alınırken hata oluştu.", { cause: error });
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
    throw new Error(message, { cause: error });
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
