import { useEffect, useState } from "react";

export function InstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (window.matchMedia("(display-mode: standalone)").matches) {
            return;
        }

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setVisible(true);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) {
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setVisible(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => setVisible(false);

    if (!visible) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:max-w-sm">
            <div className="bg-indigo-900 text-white rounded-xl shadow-2xl border border-indigo-700/50 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/30 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold">EN</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Instalar EduNotas</p>
                    <p className="text-xs text-indigo-300">Acceso rápido desde tu pantalla de inicio</p>
                </div>
                <button
                    onClick={handleInstall}
                    className="px-3 py-1.5 bg-white text-indigo-900 text-xs font-semibold rounded-lg hover:bg-indigo-50 transition-colors shrink-0"
                >
                    Instalar
                </button>
                <button
                    onClick={handleDismiss}
                    className="text-indigo-400 hover:text-white text-lg leading-none shrink-0"
                    aria-label="Cerrar"
                >
                    &times;
                </button>
            </div>
        </div>
    );
}
