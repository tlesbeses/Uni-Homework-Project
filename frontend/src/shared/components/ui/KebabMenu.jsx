import { useEffect, useRef, useState } from "react";

export const KebabMenu = ({ items }) => {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    return (
        <div ref={menuRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-label="Opciones"
                aria-expanded={open}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none"
            >
                <svg
                    className="w-5 h-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path d="M10 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
                </svg>
            </button>

            {open && (
                <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg bg-white shadow-lg border border-gray-100 py-1">
                    {(items ?? []).map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                                item.onClick();
                                setOpen(false);
                            }}
                            disabled={item.disabled}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 ${item.className ?? "text-gray-700"}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
