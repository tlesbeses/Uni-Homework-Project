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
                element: <EditProfilePage />,
            },
            {
                path: 'settings/password',
                element: <ChangePasswordProfilePage />,
            }
        ],
    },

    // Rutas Privadas / Panel de Control
    {
        element: <AppLayout />,
        children: [
            {
                path: '/dashboard',
                element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
            },
            {
                path: '/courses',
                element: <ProtectedRoute><CoursesPage /></ProtectedRoute>,
            },
            {
                path: '/courses/:id',
                element: <ProtectedRoute><CourseDetailPage /></ProtectedRoute>,
            },
        ],
    },

    // Manejo de Error 404
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);