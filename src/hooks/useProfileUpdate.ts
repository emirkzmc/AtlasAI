import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { app } from "../services/firebase.config";
import { useAuth } from "./useAuth";
import { updateDisplayName, sendEmailChangeVerification } from "../services/profile.service";

interface UseProfileUpdateReturn {
  /** Ad Soyad güncelleme */
  updatingName: boolean;
  nameError: string;
  handleNameUpdate: (newName: string) => Promise<boolean>;

  /** E-posta değişikliği doğrulama gönderimi */
  sendingEmailVerification: boolean;
  emailError: string;
  emailSuccess: boolean;
  handleEmailChange: (newEmail: string, currentPassword: string) => Promise<boolean>;
  resetEmailState: () => void;
  
  /** Doğrulama sonrası geri sayım */
  countdown: number | null;
}

export function useProfileUpdate(): UseProfileUpdateReturn {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  // Ad Soyad state
  const [updatingName, setUpdatingName] = useState(false);
  const [nameError, setNameError] = useState("");

  // E-posta state
  const [sendingEmailVerification, setSendingEmailVerification] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleNameUpdate = useCallback(
    async (newName: string): Promise<boolean> => {
      if (!user?.uid) return false;

      setNameError("");
      setUpdatingName(true);
      try {
        await updateDisplayName(user.uid, newName);
        await refreshUser();
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Ad soyad güncellenemedi.";
        setNameError(msg);
        return false;
      } finally {
        setUpdatingName(false);
      }
    },
    [user, refreshUser]
  );

  const handleEmailChange = useCallback(
    async (newEmail: string, currentPassword: string): Promise<boolean> => {
      setEmailError("");
      setEmailSuccess(false);
      setSendingEmailVerification(true);
      try {
        await sendEmailChangeVerification(newEmail, currentPassword);
        setEmailSuccess(true);
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "E-posta değişikliği başarısız.";
        setEmailError(msg);
        return false;
      } finally {
        setSendingEmailVerification(false);
      }
    },
    []
  );

  const resetEmailState = useCallback(() => {
    setEmailError("");
    setEmailSuccess(false);
    setSendingEmailVerification(false);
    setCountdown(null);
  }, []);

  // Polling for email verification completion
  useEffect(() => {
    if (!emailSuccess || !user?.email) return;

    const auth = getAuth(app);
    const initialEmail = user.email.toLowerCase();

    const intervalId = setInterval(async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        await currentUser.reload();
        if (currentUser.email && currentUser.email.toLowerCase() !== initialEmail) {
          // Email successfully updated!
          clearInterval(intervalId);
          setCountdown(3); // start 3 seconds countdown
        }
      } catch {
        // Ignore errors during polling
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(intervalId);
  }, [emailSuccess, user?.email]);

  // Countdown execution & redirect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      logout().then(() => {
        navigate("/login");
      });
    }
  }, [countdown, logout, navigate]);

  return {
    updatingName,
    nameError,
    handleNameUpdate,
    sendingEmailVerification,
    emailError,
    emailSuccess,
    handleEmailChange,
    resetEmailState,
    countdown,
  };
}
