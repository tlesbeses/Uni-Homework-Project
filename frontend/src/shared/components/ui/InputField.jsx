export const InputField = ({ label, name, type = "text", placeholder, register, error, helpText }) => (
    <div>
        {label && (
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                {label}
            </label>
        )}
        <input
            {...register(name)}
            type={type}
            placeholder={placeholder}
            className={`w-full px-4 py-3 rounded-lg border outline-none transition text-gray-700 text-sm ${error
                ? "border-red-400 focus:ring-2 focus:ring-red-200 focus:border-red-400"
                : "border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                }`}
        />
        {helpText && !error && (
            <p className="text-gray-500 text-xs mt-1">{helpText}</p>
        )}
        {error && (
            <p className="text-red-500 text-xs mt-1">{error}</p>
        )}
    </div>
);