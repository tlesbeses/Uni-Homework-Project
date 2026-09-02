import { useAuth } from "@/features/auth/providers/AuthProvider";

export function ImpersonationBanner() {
    const { isImpersonating, impersonatedAs, stopImpersonation } = useAuth();

    if (!isImpersonating) {
        return null;
    }

    const name = impersonatedAs?.username || "";

    return (
        <div className="bg-amber-500 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                <p className="min-w-0 truncate">
                    Estás probando el sistema como{" "}
                    <strong className="font-semibold">@{name}</strong>. Las
                    acciones que realices se aplicarán con esa cuenta.
                </p>
                <button
                    type="button"
                    onClick={stopImpersonation}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 font-medium transition-colors"
                >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
                        />
                    </svg>
                    Terminar vista
                </button>
            </div>
        </div>
    );
}