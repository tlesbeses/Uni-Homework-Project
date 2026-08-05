export const AutoAcceptToggle = ({ checked, onChange }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between gap-4">
            <div>
                <h2 className="text-lg font-semibold text-gray-800">
                    Aceptación automática
                </h2>
                <p className="text-sm text-gray-500">
                    Aprobar automáticamente las solicitudes de inscripción.
                </p>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative w-12 h-7 rounded-full transition ${
                    checked ? "bg-indigo-600" : "bg-gray-300"
                }`}
            >
                <span
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition ${
                        checked ? "left-6" : "left-1"
                    }`}
                />
            </button>
        </div>
    );
};
