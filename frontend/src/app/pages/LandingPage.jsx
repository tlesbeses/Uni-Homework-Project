import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/providers/AuthProvider';

export const LandingPage = () => {
    const { isAuthenticated } = useAuth();

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-700 px-6 text-center relative overflow-hidden">
            <div className="absolute top-[-10rem] left-[-10rem] w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-[-8rem] right-[-8rem] w-72 h-72 bg-indigo-400/15 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col items-center max-w-lg">
                <div className="w-24 h-24 mb-6 rounded-3xl bg-indigo-500/30 backdrop-blur-sm border border-indigo-400/30 flex items-center justify-center shadow-lg shadow-indigo-900/50">
                    <span className="text-4xl font-black text-white tracking-tight">EN</span>
                </div>

                <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-3">
                    EduNotas
                </h1>

                <p className="text-indigo-200/80 text-lg mb-10 leading-relaxed">
                    Gestiona cursos, tareas y calificaciones<br />
                    de forma simple y moderna.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Link
                        to="/login"
                        className="w-full sm:w-auto px-8 py-3.5 bg-white text-indigo-900 font-semibold rounded-xl shadow-lg shadow-indigo-950/40 hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-200 text-center"
                    >
                        Iniciar Sesión
                    </Link>
                    <Link
                        to="/signup"
                        className="w-full sm:w-auto px-8 py-3.5 bg-indigo-500/20 text-white font-semibold rounded-xl border border-indigo-400/30 backdrop-blur-sm hover:bg-indigo-500/30 hover:-translate-y-0.5 transition-all duration-200 text-center"
                    >
                        Registrarme
                    </Link>
                </div>
            </div>
        </div>
    );
};
