import { useId } from "react";

/**
 * Casilla de verificación con label y error, coherente con `InputField`.
 * El `label` admite nodos (para enlazar a Términos/Privacidad).
 */
export const Checkbox = ({ label, name, register, error, id, className = "", ...rest }) => {
    const autoId = useId();
    const fieldId = id || autoId;
    const fieldProps = register && name ? register(name) : {};

    return (
        <div className={className}>
            <div className="flex items-start gap-2.5">
                <input
                    id={fieldId}
                    type="checkbox"
                    {...fieldProps}
                    {...rest}
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 ${
                        error ? "border-red-400" : ""
                    }`}
                />
                {label && (
                    <label
                        htmlFor={fieldId}
                        className="text-sm leading-snug text-gray-600"
                    >
                        {label}
                    </label>
                )}
            </div>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
};
