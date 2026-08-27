import { Outlet } from 'react-router-dom';
import { Navbar } from '@/shared/components/Navbar';
import { InstallBanner } from '@/shared/components/InstallBanner';

export default function AppLayout() {

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                <Outlet />
            </main>
            <InstallBanner />
        </div>
    );
}