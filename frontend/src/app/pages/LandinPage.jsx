import { Link } from 'react-router-dom';

export const LandingPage = () => (
    <div className="p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Bienvenido a EduNotas
        </h1>

        <p className="mb-6 text-gray-600">
            La mejor app para registrar notas de tus estudiantes.
        </p>

        <div className="space-x-4">
            <Link
                to="/login"
                className="bg-indigo-600 text-white px-4 py-2 rounded"
            >
                Iniciar Sesión
            </Link>

            <Link
                to="/registro"
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded"
            >
                Registrarme
            </Link>
        </div>
    </div>
);
