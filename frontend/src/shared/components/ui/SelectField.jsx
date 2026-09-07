import { useId } from "react";

export const SelectField = ({ label, name, register, error, helpText, compact = false, className = "", children, ...rest }) => {
    const fieldId = useId();
    const fieldProps = register && name ? register(name) : {};

    return (
        <div>
            {label && (
                <label htmlFor={fieldId} className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    {label}
                </label>
            )}
            <select
                id={fieldId}
                {...fieldProps}
                {...rest}
                className={`w-full ${compact ? "px-3 py-2" : "px-4 py-3"} rounded-lg border outline-none transition text-gray-700 text-sm ${error
                    ? "border-red-400 focus:ring-2 focus:ring-red-200 focus:border-red-400"
                    : "border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    } ${className}`}
            >
                {children}
            </select>
            {helpText && !error && (
                <p className="text-gray-500 text-xs mt-1">{helpText}</p>
            )}
            {error && (
                <p className="text-red-500 text-xs mt-1">{error}</p>
            )}
        </div>
    );
};