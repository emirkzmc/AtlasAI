import { Navigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { useAuth } from "../hooks/useAuth";
import Loader from "../components/Loader";
import EmailVerificationPage from "../pages/auth/EmailVerificationPage";
import { app } from "../services/firebase.config";
import type { JSX } from "react";

/**
 * Guards /email-dogrulama: wait for auth init, redirect verified users to panel,
 * unauthenticated users to login.
 */
export function EmailVerificationRoute(): JSX.Element {
  const { user, loading } = useAuth();
  const firebaseUser = getAuth(app).currentUser;

  if (loading) {
    return <Loader />;
  }

  if (!user && !firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  const isVerified =
    user?.emailVerified === true || firebaseUser?.emailVerified === true;

  if (isVerified) {
    const role = user?.role ?? "student";
    return <Navigate to={`/panel/${role}`} replace />;
  }

  return <EmailVerificationPage />;
}
