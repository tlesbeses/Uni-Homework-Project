import { Link, Outlet } from 'react-router-dom';
import { Navbar } from '@/shared/components/Navbar';
import { InstallBanner } from '@/shared/components/InstallBanner';
import { ImpersonationBanner } from '@/features/auth/components/ImpersonationBanner';
import { TermsReacceptModal } from '@/features/legal/components/TermsReacceptModal';

export default function AppLayout() {

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            <ImpersonationBanner />
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                <Outlet />
            </main>
            <footer className="w-full border-t border-slate-200 bg-white print:hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
                    <span>EduNotas · Gestión académica</span>
                    <div className="flex items-center gap-4">
                        <Link to="/terms" className="hover:text-indigo-600 hover:underline">
                            Términos y Condiciones
                        </Link>
                        <Link to="/privacy" className="hover:text-indigo-600 hover:underline">
                            Política de Privacidad
                        </Link>
                    </div>
                </div>
            </footer>
            <InstallBanner />
            <TermsReacceptModal />
        </div>
    );
}
