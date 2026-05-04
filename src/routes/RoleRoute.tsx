import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/auth.types";
import type { JSX } from "react";

interface RoleRouteProps {
  allowedRole: UserRole;
}

export function RoleRoute({ allowedRole }: RoleRouteProps): JSX.Element {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to={`/panel/${user.role}`} replace />;
  }

  return <Outlet />;
}
