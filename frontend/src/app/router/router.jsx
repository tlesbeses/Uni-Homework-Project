import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '@/app/layouts/AppLayout';
import AuthLayout from '@/app/layouts/AuthLayout';

// Páginas de Ejemplo (Reemplaza con tus componentes reales)
import { LandingPage } from '@/app/pages/LandingPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { DashboardPage } from '@/app/pages/DashboardPage';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { EditProfilePage } from '@/features/auth/pages/EditProfile';
import { ChangePasswordProfilePage } from '@/features/auth/pages/ChangePasswordProfile';
import { CoursesPage } from '@/features/courses/pages/CoursesPage';
import { CourseDetailPage } from '@/features/courses/pages/CourseDetailPage';
import { TeamsPage } from '@/features/teams/pages/TeamsPage';
import { TeamDetailPage } from '@/features/teams/pages/TeamDetailPage';

export const router = createBrowserRouter([
    // Ruta Pública: Landing Page
    {
        path: '/',
        element: <LandingPage />,
    },

    // Rutas de Autenticación (Login, Registro)
    {
        element: <AuthLayout />,
        children: [
            {
                path: '/login',
                element: <LoginPage />,
            },
            {
                path: '/signup',
                element: <RegisterPage />,
            },
            {
                path: 'settings/profile',
                element: <ProtectedRoute><EditProfilePage /></ProtectedRoute>,
            },
            {
                path: 'settings/password',
                element: <ProtectedRoute><ChangePasswordProfilePage /></ProtectedRoute>,
            }
        ],
    },

    // Rutas Privadas / Panel de Control
    {
        element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
        children: [
            {
                path: '/dashboard',
                element: <DashboardPage />,
            },
            {
                path: '/courses',
                element: <CoursesPage />,
            },
            {
                path: '/courses/:id',
                element: <CourseDetailPage />,
            },
            {
                path: '/teams',
                element: <TeamsPage />,
            },
            {
                path: '/teams/:id',
                element: <TeamDetailPage />,
            },
        ],
    },

    // Manejo de Error 404
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);