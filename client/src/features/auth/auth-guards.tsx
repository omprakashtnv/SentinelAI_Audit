import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingScreen } from "@/components/feedback/loading-screen";
import { useAuth } from "@/features/auth/auth-context";

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

