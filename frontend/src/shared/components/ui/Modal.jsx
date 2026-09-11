import { useEffect, useId, useRef } from "react";

const SIZE_CLASSES = {
    md: "max-w-md",
    lg: "max-w-lg",
};

const TABBABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
].join(", ");

export const Modal = ({ open, title, onClose, size = "lg", className = "", children }) => {
    const titleId = useId();
    const panelRef = useRef(null);
    const lastFocusedRef = useRef(null);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        lastFocusedRef.current = document.activeElement;
        const panel = panelRef.current;
        panel?.focus();

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && onClose) {
                onClose();
                return;
            }
            if (event.key !== "Tab" || !panel) {
                return;
            }
            const focusable = panel.querySelectorAll(TABBABLE_SELECTOR);
            if (focusable.length === 0) {
                event.preventDefault();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            const previous = lastFocusedRef.current;
            if (previous && previous.isConnected) {
                previous.focus?.();
            }
        };
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
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                tabIndex={-1}
                className={`w-full ${SIZE_CLASSES[size]} bg-white rounded-2xl shadow-xl animate-pop outline-none ${className}`}
            >
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h2 id={titleId} className="text-lg font-semibold text-gray-800">
                            {title}
                        </h2>
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