import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/store";
import type { Role } from "../types";

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
