import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';

// Páginas de Ejemplo (Reemplaza con tus componentes reales)
import { LandingPage } from '../pages/LandinPage.jsx';
import { LoginPage } from '../../features/auth/pages/LoginPage.jsx';
import { RegisterPage } from '../../features/auth/pages/RegisterPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import ProtectedRoute from '../../features/auth/ProtectedRoute.jsx';

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