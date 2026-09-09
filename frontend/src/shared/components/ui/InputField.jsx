import { useId, useState } from "react";

const EYE_ICON = (
    <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z"
        />
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
    </svg>
);

const EYE_SLASH_ICON = (
    <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
        />
    </svg>
);

export const InputField = ({ label, name, type = "text", placeholder, register, error, helpText }) => {
    const [show, setShow] = useState(false);
    const fieldId = useId();
    const isPassword = type === "password";
    const fieldProps = register && name ? register(name) : {};

    return (
        <div>
            {label && (
                <label htmlFor={fieldId} className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    id={fieldId}
                    {...fieldProps}
                    type={isPassword && show ? "text" : type}
                    placeholder={placeholder}
                    className={`w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm ${isPassword ? "pr-12" : ""} ${error
                        ? "border-red-400 focus:ring-2 focus:ring-red-200 focus:border-red-400"
                        : "border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        }`}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShow((value) => !value)}
                        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                        aria-pressed={show}
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-r-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                    >
                        {show ? EYE_SLASH_ICON : EYE_ICON}
                    </button>
                )}
            </div>
            {helpText && !error && (
                <p className="text-gray-500 text-xs mt-1">{helpText}</p>
            )}
            {error && (
                <p className="text-red-500 text-xs mt-1">{error}</p>
            )}
        </div>
    );
};