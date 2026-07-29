export const InputField = ({ label, error, register, name, type = "text", placeholder }) => (
    <div>
        {label && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
        )}
        <input
            {...register(name)}
            type={type}
            placeholder={placeholder}
            className={`w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 ${error
                ? "border-red-300 focus:ring-red-200"
                : "border-gray-300 focus:ring-indigo-500"
                }`}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);