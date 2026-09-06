import { Suspense } from "react";

export const PageSkeleton = () => (
    <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-400">Cargando...</div>
    </div>
);

export const SuspenseWrapper = ({ children }) => (
    <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
);