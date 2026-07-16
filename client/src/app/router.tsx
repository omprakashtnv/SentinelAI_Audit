import { createBrowserRouter, Navigate } from "react-router-dom";

import { AuthLayout } from "@/app/layouts/auth-layout";
import { DashboardLayout } from "@/app/layouts/dashboard-layout";
import { RootLayout } from "@/app/layouts/root-layout";
import { RouteErrorBoundary } from "@/components/feedback/error-boundary";
import { ProtectedRoute, PublicOnlyRoute } from "@/features/auth/auth-guards";
import { AuditsPage } from "@/routes/audits.page";
import { DashboardPage } from "@/routes/dashboard.page";
import { ForgotPasswordPage } from "@/routes/forgot-password.page";
import { LoginPage } from "@/routes/login.page";
import { NotFoundPage } from "@/routes/not-found.page";
import { ProfilePage } from "@/routes/profile.page";
import { RegisterPage } from "@/routes/register.page";
import { ReportsPage } from "@/routes/reports.page";
import { SettingsPage } from "@/routes/settings.page";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: "login", element: <LoginPage /> },
              { path: "register", element: <RegisterPage /> },
              { path: "forgot-password", element: <ForgotPasswordPage /> },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/",
            element: <DashboardLayout />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              { path: "dashboard", element: <DashboardPage /> },
              { path: "audits", element: <AuditsPage /> },
              { path: "reports", element: <ReportsPage /> },
              { path: "profile", element: <ProfilePage /> },
              { path: "settings", element: <SettingsPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
