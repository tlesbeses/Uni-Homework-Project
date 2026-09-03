export const SearchInput = ({ value, onChange, placeholder = "Buscar..." }) => (
    <div className="relative">
        <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
            </svg>
        </span>
        <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
        {value && (
            <button
                type="button"
                onClick={() => onChange("")}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 transition"
            >
                <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>
        )}
    </div>
);
