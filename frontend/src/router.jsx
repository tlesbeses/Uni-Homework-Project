import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';

// Páginas de Ejemplo (Reemplaza con tus componentes reales)
import { LandingPage } from './pages/index.jsx';
import { LoginPage } from './pages/index.jsx';
import { RegisterPage } from './pages/index.jsx';
import { DashboardPage } from './pages/index.jsx';
import { RegistrarNotaPage } from './pages/index.jsx';
import { EstudiantesPage } from './pages/index.jsx';
import { NotFoundPage } from './pages/index.jsx';

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
                element: <DashboardPage />,
            },
            {
                path: '/notas/registrar',
                element: <RegistrarNotaPage />,
            },
            {
                path: '/estudiantes',
                element: <EstudiantesPage />,
            },
        ],
    },

    // Manejo de Error 404
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);