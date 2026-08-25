import { Link } from "react-router-dom";

export const ForbiddenPage = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
            <div className="mb-6">
                <svg
                    className="mx-auto w-24 h-24 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
                    />
                </svg>
            </div>
            <h1 className="text-6xl font-bold text-gray-800 mb-2">403</h1>
            <h2 className="text-xl font-semibold text-gray-700 mb-3">
                Acceso denegado
            </h2>
            <p className="text-gray-500 mb-8">
                No tienes permiso para acceder a esta página. Si crees que esto
                es un error, contacta al administrador.
            </p>
            <Link
                to="/"
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
                <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                    />
                </svg>
                Volver al inicio
            </Link>
        </div>
    </div>
);
