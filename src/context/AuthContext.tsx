import { useEffect, useState, useCallback, type ReactNode } from "react";
import { getAuth } from "firebase/auth";
import type {
  AuthUser,
  AuthContextType,
  LoginCredentials,
  RegisterCredentials,
} from "../types/auth.types";
import {
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  getUserFromFirestore,
  subscribeToAuthState,
} from "../services/auth.service";
import { app } from "../services/firebase.config";
import type { JSX } from "react/jsx-runtime";
import { AuthContext } from "./AuthContextDef";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          let authUser = await getUserFromFirestore(firebaseUser.uid);

          if (!authUser) {
            // Firestore doc missing (or permission denied for unverified users).
            // Build a minimal AuthUser from Firebase Auth data so routing works.
            console.error(
              "[AuthContext] User document not found for uid:",
              firebaseUser.uid,
              "— falling back to minimal auth user."
            );
            authUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? "",
              role: "student",
              createdAt: new Date(),
              emailVerified: firebaseUser.emailVerified,
            };
          } else {
            authUser.emailVerified = firebaseUser.emailVerified;
            // Firebase Auth e-postası her zaman kaynaktır (Firestore stale olabilir)
            authUser.email = firebaseUser.email ?? authUser.email;
          }

          setUser(authUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("[AuthContext] Error resolving auth state:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      const authUser = await loginWithEmail(credentials);
      setUser(authUser);
    },
    []
  );

  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<void> => {
      const authUser = await registerWithEmail(credentials);
      setUser(authUser);
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    await logoutUser();
    setUser(null);
  }, []);

  /**
   * Reload the Firebase Auth user to pick up the latest emailVerified flag,
   * then re-fetch the Firestore document and update context state.
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    const auth = getAuth(app);
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;

    await firebaseUser.reload();
    const reloaded = auth.currentUser; // re-read after reload
    if (!reloaded) return;

    let authUser = await getUserFromFirestore(reloaded.uid);
    if (!authUser) {
      authUser = {
        uid: reloaded.uid,
        email: reloaded.email ?? "",
        role: "student",
        createdAt: new Date(),
        emailVerified: reloaded.emailVerified,
      };
    } else {
      authUser.emailVerified = reloaded.emailVerified;
      // Firebase Auth e-postası her zaman kaynaktır
      authUser.email = reloaded.email ?? authUser.email;
    }
    setUser(authUser);
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
