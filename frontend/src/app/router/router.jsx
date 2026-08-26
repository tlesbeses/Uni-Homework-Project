import { createBrowserRouter } from "react-router-dom";
import AppLayout from "@/app/layouts/AppLayout";
import AuthLayout from "@/app/layouts/AuthLayout";

import { LandingPage } from "@/app/pages/LandingPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { DashboardPage } from "@/app/pages/DashboardPage";
import { NotFoundPage } from "@/app/pages/NotFoundPage";
import { UnauthorizedPage } from "@/app/pages/UnauthorizedPage";
import { ForbiddenPage } from "@/app/pages/ForbiddenPage";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { EditProfilePage } from "@/features/auth/pages/EditProfile";
import { ChangePasswordProfilePage } from "@/features/auth/pages/ChangePasswordProfile";
import { CoursesPage } from "@/features/courses/pages/CoursesPage";
import { CourseDetailPage } from "@/features/courses/pages/CourseDetailPage";
import { AssignmentsPage } from "@/features/assignments/pages/AssignmentsPage";
import { GradesPage } from "@/features/grades/pages/GradesPage";
import { GradesReportPage } from "@/features/grades/pages/GradesReportPage";
import { TeamsPage } from "@/features/teams/pages/TeamsPage";
import { TeamDetailPage } from "@/features/teams/pages/TeamDetailPage";

export const router = createBrowserRouter([
  // Ruta Pública: Landing Page
  {
    path: "/",
    element: <LandingPage />,
  },

  // Páginas de error
  {
    path: "/401",
    element: <UnauthorizedPage />,
  },
  {
    path: "/403",
    element: <ForbiddenPage />,
  },

  // Rutas de Autenticación (Login, Registro)
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/signup",
        element: <RegisterPage />,
      },
      {
        path: "settings/profile",
        element: (
          <ProtectedRoute>
            <EditProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "settings/password",
        element: (
          <ProtectedRoute>
            <ChangePasswordProfilePage />
          </ProtectedRoute>
        ),
      },
    ],
  },

  // Rutas Privadas / Panel de Control
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/dashboard",
        element: <DashboardPage />,
      },
      {
        path: "/courses",
        element: <CoursesPage />,
      },
      {
        path: "/courses/:id",
        element: <CourseDetailPage />,
      },
      {
        path: "/teams",
        element: <TeamsPage />,
      },
      {
        path: "/teams/:id",
        element: <TeamDetailPage />,
      },
      //future features its comented because the assignments page is not developed yet,
      // {
      //   path: "/assignments",
      //   element: <AssignmentsPage />,
      // },
      {
        path: "/grades/report",
        element: <GradesReportPage />,
      },
      {
        path: "/grades",
        element: <GradesPage />,
      },
    ],
  },

  // Manejo de Error 404
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
