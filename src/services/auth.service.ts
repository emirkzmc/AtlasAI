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
  serverTimestamp,
} from "firebase/firestore";
import { app } from "./firebase.config";
import type {
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  UserRole,
} from "../types/auth.types";

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

    return authUser;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message, { cause: error });
    }
    throw new Error("Giriş sırasında beklenmeyen bir hata oluştu.", { cause: error });
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
      createdAt: ReturnType<typeof serverTimestamp>;
    } = {
      uid: user.uid,
      email: credentials.email,
      role: credentials.role,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", user.uid), userData);

    await sendEmailVerification(user);

    const authUser: AuthUser = {
      uid: user.uid,
      email: credentials.email,
      role: credentials.role,
      createdAt: new Date(),
    };

    await signOut(auth);

    return authUser;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message, { cause: error });
    }
    throw new Error("Kayıt sırasında beklenmeyen bir hata oluştu.", { cause: error });
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
    };

    return {
      uid: data.uid,
      email: data.email,
      role: data.role,
      createdAt: data.createdAt?.toDate() ?? new Date(),
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
    if (error instanceof Error) {
      throw new Error(error.message, { cause: error });
    }
    throw new Error("Doğrulama maili gönderilirken hata oluştu.", { cause: error });
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
