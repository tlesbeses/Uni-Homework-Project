import { useEffect } from "react";

const SIZE_CLASSES = {
    md: "max-w-md",
    lg: "max-w-lg",
};

export const Modal = ({ open, title, onClose, size = "lg", className = "", children }) => {
    useEffect(() => {
        if (!open || !onClose) {
            return undefined;
        }
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && onClose) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                className={`w-full ${SIZE_CLASSES[size]} bg-white rounded-2xl shadow-xl animate-pop ${className}`}
            >
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Cerrar"
                                className="text-gray-400 hover:text-gray-600 text-xl leading-none transition"
                            >
                                &times;
                            </button>
                        )}
                    </div>
                )}
                {children}
            </div>
        </div>
    );
};