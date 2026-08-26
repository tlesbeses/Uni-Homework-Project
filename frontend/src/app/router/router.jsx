import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "@/app/layouts/AppLayout";
import AuthLayout from "@/app/layouts/AuthLayout";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";

const PageSkeleton = () => (
    <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-400">Cargando...</div>
    </div>
);

const SuspenseWrapper = ({ children }) => (
    <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
);

const lazyPage = (importFn, name) =>
    lazy(() => importFn().then((m) => ({ default: m[name] })));

const LandingPage = lazyPage(() => import("@/app/pages/LandingPage"), "LandingPage");
const LoginPage = lazyPage(() => import("@/features/auth/pages/LoginPage"), "LoginPage");
const RegisterPage = lazyPage(() => import("@/features/auth/pages/RegisterPage"), "RegisterPage");
const DashboardPage = lazyPage(() => import("@/app/pages/DashboardPage"), "DashboardPage");
const NotFoundPage = lazyPage(() => import("@/app/pages/NotFoundPage"), "NotFoundPage");
const UnauthorizedPage = lazyPage(() => import("@/app/pages/UnauthorizedPage"), "UnauthorizedPage");
const ForbiddenPage = lazyPage(() => import("@/app/pages/ForbiddenPage"), "ForbiddenPage");
const EditProfilePage = lazyPage(() => import("@/features/auth/pages/EditProfile"), "EditProfilePage");
const ChangePasswordProfilePage = lazyPage(() => import("@/features/auth/pages/ChangePasswordProfile"), "ChangePasswordProfilePage");
const CoursesPage = lazyPage(() => import("@/features/courses/pages/CoursesPage"), "CoursesPage");
const CourseDetailPage = lazyPage(() => import("@/features/courses/pages/CourseDetailPage"), "CourseDetailPage");
const AssignmentsPage = lazyPage(() => import("@/features/assignments/pages/AssignmentsPage"), "AssignmentsPage");
const GradesPage = lazyPage(() => import("@/features/grades/pages/GradesPage"), "GradesPage");
const GradesReportPage = lazyPage(() => import("@/features/grades/pages/GradesReportPage"), "GradesReportPage");
const TeamsPage = lazyPage(() => import("@/features/teams/pages/TeamsPage"), "TeamsPage");
const TeamDetailPage = lazyPage(() => import("@/features/teams/pages/TeamDetailPage"), "TeamDetailPage");

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <SuspenseWrapper>
        <LandingPage />
      </SuspenseWrapper>
    ),
  },
  {
    path: "/401",
    element: (
      <SuspenseWrapper>
        <UnauthorizedPage />
      </SuspenseWrapper>
    ),
  },
  {
    path: "/403",
    element: (
      <SuspenseWrapper>
        <ForbiddenPage />
      </SuspenseWrapper>
    ),
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: (
          <SuspenseWrapper>
            <LoginPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "/signup",
        element: (
          <SuspenseWrapper>
            <RegisterPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "settings/profile",
        element: (
          <ProtectedRoute>
            <SuspenseWrapper>
              <EditProfilePage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: "settings/password",
        element: (
          <ProtectedRoute>
            <SuspenseWrapper>
              <ChangePasswordProfilePage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/dashboard",
        element: (
          <SuspenseWrapper>
            <DashboardPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "/courses",
        element: (
          <SuspenseWrapper>
            <CoursesPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "/courses/:id",
        element: (
          <SuspenseWrapper>
            <CourseDetailPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "/teams",
        element: (
          <SuspenseWrapper>
            <TeamsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "/teams/:id",
        element: (
          <SuspenseWrapper>
            <TeamDetailPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "/grades/report",
        element: (
          <SuspenseWrapper>
            <GradesReportPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "/grades",
        element: (
          <SuspenseWrapper>
            <GradesPage />
          </SuspenseWrapper>
        ),
      },
    ],
  },
  {
    path: "*",
    element: (
      <SuspenseWrapper>
        <NotFoundPage />
      </SuspenseWrapper>
    ),
  },
]);
