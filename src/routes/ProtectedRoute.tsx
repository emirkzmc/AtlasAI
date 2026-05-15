import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Loader from "../components/Loader";
import type { JSX } from "react";

export function ProtectedRoute(): JSX.Element {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but email not verified → block dashboard access
  if (!user.emailVerified) {
    return <Navigate to="/email-dogrulama" replace />;
  }

  return <Outlet />;
}
