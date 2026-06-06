import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { getAuth, type User } from "firebase/auth";
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

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const LEGACY_SESSION_EXPIRES_AT_KEY = "atlasai_session_expires_at";
const SESSION_EXPIRES_AT_KEY_PREFIX = "atlasai_session_expires_at";
const SESSION_REFRESH_THROTTLE_MS = 60 * 1000;


const SESSION_EXPIRED_MESSAGE =
    "Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.";

function getSessionStorageKey(uid: string): string {
  return `${SESSION_EXPIRES_AT_KEY_PREFIX}_${uid}`;
}

function getStoredSessionExpiresAt(uid: string): number | null {
  const value = window.localStorage.getItem(getSessionStorageKey(uid));
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function setStoredSessionExpiresAt(uid: string, expiresAt: number): void {
  window.localStorage.setItem(getSessionStorageKey(uid), String(expiresAt));
}

function clearStoredSession(uid?: string | null): void {
  if (uid) {
    window.localStorage.removeItem(getSessionStorageKey(uid));
  }

  window.localStorage.removeItem(LEGACY_SESSION_EXPIRES_AT_KEY);
}

function buildFallbackAuthUser(firebaseUser: User): AuthUser {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? "",
    role: "student",
    createdAt: new Date(),
    emailVerified: firebaseUser.emailVerified,
  };
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const sessionTimeoutRef = useRef<number | undefined>(undefined);
  const activeSessionUidRef = useRef<string | null>(null);
  const lastSessionRefreshRef = useRef<number>(0);

  const clearSessionTimeout = useCallback((): void => {
    if (sessionTimeoutRef.current !== undefined) {
      window.clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = undefined;
    }
  }, []);

  const expireSession = useCallback(async (uid?: string): Promise<void> => {
    const currentUid = getAuth(app).currentUser?.uid ?? null;

    if (uid && currentUid && currentUid !== uid) {
      clearStoredSession(uid);
      return;
    }

    clearSessionTimeout();
    clearStoredSession(uid ?? activeSessionUidRef.current);
    activeSessionUidRef.current = null;

    try {
      await logoutUser();
    } catch (err) {
      console.error("[AuthContext] Oturum sonlandırılırken hata oluştu:", err);
    } finally {
      setUser(null);
      setLoading(false);
      console.info(SESSION_EXPIRED_MESSAGE);
    }
  }, [clearSessionTimeout]);

  const scheduleSessionExpiration = useCallback(
      (uid: string, expiresAt: number): boolean => {
        const armTimeout = (nextExpiresAt: number): boolean => {
          const remainingMs = nextExpiresAt - Date.now();

          if (remainingMs <= 0) {
            const latestExpiresAt = getStoredSessionExpiresAt(uid);

            if (latestExpiresAt !== null && latestExpiresAt > Date.now()) {
              return armTimeout(latestExpiresAt);
            }

            void expireSession(uid);
            return false;
          }

          clearSessionTimeout();

          sessionTimeoutRef.current = window.setTimeout(() => {
            const latestExpiresAt = getStoredSessionExpiresAt(uid);

            if (latestExpiresAt !== null && latestExpiresAt > Date.now()) {
              armTimeout(latestExpiresAt);
              return;
            }

            void expireSession(uid);
          }, remainingMs);

          return true;
        };

        return armTimeout(expiresAt);
      },
      [clearSessionTimeout, expireSession]
  );

  const refreshSession = useCallback(
      async (uid: string): Promise<boolean> => {
        activeSessionUidRef.current = uid;

        const currentExpiresAt = getStoredSessionExpiresAt(uid);

        if (currentExpiresAt !== null && currentExpiresAt <= Date.now()) {
          await expireSession(uid);
          return false;
        }

        const nextExpiresAt = Date.now() + SESSION_DURATION_MS;
        setStoredSessionExpiresAt(uid, nextExpiresAt);
        scheduleSessionExpiration(uid, nextExpiresAt);

        return true;
      },
      [expireSession, scheduleSessionExpiration]
  );

  const refreshSessionIfUserIsActive = useCallback((): void => {
    const now = Date.now();

    if (now - lastSessionRefreshRef.current < SESSION_REFRESH_THROTTLE_MS) {
      return;
    }

    lastSessionRefreshRef.current = now;

    const firebaseUser = getAuth(app).currentUser;
    if (!firebaseUser) return;

    void refreshSession(firebaseUser.uid);
  }, [refreshSession]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          clearSessionTimeout();
          clearStoredSession(activeSessionUidRef.current);
          activeSessionUidRef.current = null;
          setUser(null);
          return;
        }

        const sessionIsActive = await refreshSession(firebaseUser.uid);
        if (!sessionIsActive) return;

        let authUser = await getUserFromFirestore(firebaseUser.uid);

        if (!authUser) {
          console.error(
              "[AuthContext] Kullanıcı Firestore dokümanı bulunamadı:",
              firebaseUser.uid
          );

          authUser = buildFallbackAuthUser(firebaseUser);
        } else {
          authUser.emailVerified = firebaseUser.emailVerified;
          authUser.email = firebaseUser.email ?? authUser.email;
        }

        setUser(authUser);
      } catch (err) {
        console.error("[AuthContext] Auth state çözümlenirken hata oluştu:", err);
        clearStoredSession(activeSessionUidRef.current);
        activeSessionUidRef.current = null;
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      clearSessionTimeout();
    };
  }, [clearSessionTimeout, refreshSession]);

  useEffect(() => {
    const activityEvents = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ] as const;

    const handleActivity = (): void => {
      refreshSessionIfUserIsActive();
    };

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        refreshSessionIfUserIsActive();
      }
    };

    activityEvents.forEach((eventName) => {
      document.addEventListener(eventName, handleActivity);
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      activityEvents.forEach((eventName) => {
        document.removeEventListener(eventName, handleActivity);
      });

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshSessionIfUserIsActive]);

  const login = useCallback(
      async (credentials: LoginCredentials): Promise<void> => {
        const authUser = await loginWithEmail(credentials);

        const firebaseUser = getAuth(app).currentUser;
        if (firebaseUser) {
          await refreshSession(firebaseUser.uid);
        }

        setUser(authUser);
      },
      [refreshSession]
  );

  const register = useCallback(
      async (credentials: RegisterCredentials): Promise<void> => {
        const authUser = await registerWithEmail(credentials);

        const firebaseUser = getAuth(app).currentUser;
        if (firebaseUser) {
          await refreshSession(firebaseUser.uid);
        }

        setUser(authUser);
      },
      [refreshSession]
  );

  const logout = useCallback(async (): Promise<void> => {
    const sessionUid = getAuth(app).currentUser?.uid ?? activeSessionUidRef.current;

    clearSessionTimeout();
    clearStoredSession(sessionUid);
    activeSessionUidRef.current = null;

    await logoutUser();
    setUser(null);
  }, [clearSessionTimeout]);

  const refreshUser = useCallback(async (): Promise<void> => {
    const auth = getAuth(app);
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) return;

    const sessionIsActive = await refreshSession(firebaseUser.uid);
    if (!sessionIsActive) return;

    await firebaseUser.reload();

    const reloadedUser = auth.currentUser;
    if (!reloadedUser) return;

    let authUser = await getUserFromFirestore(reloadedUser.uid);

    if (!authUser) {
      authUser = buildFallbackAuthUser(reloadedUser);
    } else {
      authUser.emailVerified = reloadedUser.emailVerified;
      authUser.email = reloadedUser.email ?? authUser.email;
    }

    setUser(authUser);
  }, [refreshSession]);

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
