import { Outlet, Link, useNavigate } from 'react-router-dom';

export default function AppLayout() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Navbar Superior */}
            <header className="bg-indigo-600 text-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-8">
                        <Link to="/dashboard" className="text-xl font-bold tracking-wide">
                            EduNotas
                        </Link>
                        <nav className="hidden md:flex space-x-4 text-sm font-medium">
                            <Link to="/dashboard" className="hover:text-indigo-200 transition">Inicio</Link>
                            <Link to="/estudiantes" className="hover:text-indigo-200 transition">Estudiantes</Link>
                            <Link to="/reportes" className="hover:text-indigo-200 transition">Reportes</Link>
                        </nav>
                    </div>

                    {/* Botón Acción Principal */}
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate('/notas/registrar')}
                            className="bg-white text-indigo-600 hover:bg-indigo-50 font-semibold px-4 py-2 rounded-lg text-sm shadow transition"
                        >
                            + Registrar Nota
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="text-xs text-indigo-200 hover:text-white underline"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </header>

            {/* Contenido Dinámico de las Páginas */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                <Outlet />
            </main>
        </div>
    );
}