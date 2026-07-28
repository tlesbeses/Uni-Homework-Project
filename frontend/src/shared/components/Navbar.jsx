import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider.jsx';

export function Navbar() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    return (
        <header className="bg-indigo-600 text-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

                <div className="flex items-center space-x-8">
                    <Link
                        to="/dashboard"
                        className="text-xl font-bold tracking-wide"
                    >
                        EduNotas
                    </Link>

                    <nav className="hidden md:flex space-x-4 text-sm font-medium">
                        <Link
                            to="/dashboard"
                            className="hover:text-indigo-200 transition"
                        >
                            Inicio
                        </Link>

                    </nav>
                </div>

                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/notas/registrar')}
                        className="bg-white text-indigo-600 hover:bg-indigo-50 font-semibold px-4 py-2 rounded-lg text-sm shadow transition"
                    >
                        + Registrar Nota
                    </button>

                    <button
                        onClick={logout}
                        className="text-xs text-indigo-200 hover:text-white underline"
                    >
                        Cerrar sesión
                    </button>
                </div>

            </div>
        </header>
    );
}