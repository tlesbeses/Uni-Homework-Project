import { useEffect, useState } from "react";

export function ThrottleToast({ retryAfter, onDone }) {
    const [seconds, setSeconds] = useState(retryAfter);

    useEffect(() => {
        if (seconds <= 0) {
            onDone();
            return;
        }
        const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => clearTimeout(id);
    }, [seconds, onDone]);

    if (seconds <= 0) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
            <div className="flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg">
                <svg
                    className="w-5 h-5 shrink-0 text-amber-400 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                </svg>
                <span className="text-sm">
                    Demasiadas peticiones. Reintentando en{" "}
                    <span className="font-bold text-amber-400">{seconds}s</span>
                </span>
            </div>
        </div>
    );
}
