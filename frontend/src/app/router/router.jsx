import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '@/app/layouts/AppLayout';
import AuthLayout from '@/app/layouts/AuthLayout';

// Páginas de Ejemplo (Reemplaza con tus componentes reales)
import { LandingPage } from '@/app/pages/LandinPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { DashboardPage } from '@/app/pages/DashboardPage';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

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
                path: '/registro',
                element: <RegisterPage />,
            },
        ],
    },

    // Rutas Privadas / Panel de Control
    {
        element: <AppLayout />,
        children: [
            {
                path: '/dashboard',
                element: <ProtectedRoute ><DashboardPage /></ProtectedRoute>,
            },
        ],
    },

    // Manejo de Error 404
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);