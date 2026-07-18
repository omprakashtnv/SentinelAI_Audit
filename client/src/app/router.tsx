import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { AuthLayout } from "@/app/layouts/auth-layout";
import { DashboardLayout } from "@/app/layouts/dashboard-layout";
import { RootLayout } from "@/app/layouts/root-layout";
import { RouteErrorBoundary } from "@/components/feedback/error-boundary";
import { ProtectedRoute, PublicOnlyRoute } from "@/features/auth/auth-guards";
import { AuditsPage } from "@/routes/audits.page";
import { CreateProjectPage } from "@/routes/create-project.page";
import { DashboardPage } from "@/routes/dashboard.page";
import { EditProjectPage } from "@/routes/edit-project.page";
import { ForgotPasswordPage } from "@/routes/forgot-password.page";
import { FindingDetailsPage } from "@/routes/finding-details.page";
import { LoginPage } from "@/routes/login.page";
import { NotFoundPage } from "@/routes/not-found.page";
import { ProfilePage } from "@/routes/profile.page";
import { ProjectDetailsPage } from "@/routes/project-details.page";
import { ProjectsPage } from "@/routes/projects.page";
import { RegisterPage } from "@/routes/register.page";
import { RepositorySecurityPage } from "@/routes/repository-security.page";
import { ReportsPage } from "@/routes/reports.page";
import { SettingsPage } from "@/routes/settings.page";
import { UploadRepositoryPage } from "@/routes/upload-repository.page";

const RepositoryExplorerPage = lazy(() =>
  import("@/routes/repository-explorer.page").then((module) => ({
    default: module.RepositoryExplorerPage,
  })),
);

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
              { path: "projects", element: <ProjectsPage /> },
              { path: "projects/new", element: <CreateProjectPage /> },
              { path: "projects/:projectId", element: <ProjectDetailsPage /> },
              { path: "projects/:projectId/security", element: <RepositorySecurityPage /> },
              { path: "projects/:projectId/findings/:findingId", element: <FindingDetailsPage /> },
              { path: "projects/:projectId/upload", element: <UploadRepositoryPage /> },
              {
                path: "projects/:projectId/repository",
                element: (
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <RepositoryExplorerPage />
                  </Suspense>
                ),
              },
              { path: "projects/:projectId/edit", element: <EditProjectPage /> },
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

function RouteLoadingFallback() {
  return (
    <div className="grid min-h-96 place-items-center rounded-lg border border-border bg-card">
      <div className="text-sm text-muted-foreground">Loading</div>
    </div>
  );
}
