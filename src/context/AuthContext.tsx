import { createContext, useEffect, useState, useCallback, type ReactNode } from "react";
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
import type { JSX } from "react/jsx-runtime";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
          const authUser = await getUserFromFirestore(firebaseUser.uid);
          setUser(authUser);
        } else {
          setUser(null);
        }
      } catch {
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
      await registerWithEmail(credentials);
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    await logoutUser();
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
