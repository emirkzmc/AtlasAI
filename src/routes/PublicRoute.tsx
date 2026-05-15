import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Loader from "../components/Loader";
import type { JSX } from "react";

export function PublicRoute(): JSX.Element {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  if (user) {
    // Authenticated but email not yet verified → verification page
    if (!user.emailVerified) {
      return <Navigate to="/email-dogrulama" replace />;
    }
    return <Navigate to={`/panel/${user.role}`} replace />;
  }

  return <Outlet />;
}
