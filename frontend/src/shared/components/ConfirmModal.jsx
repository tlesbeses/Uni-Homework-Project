export const ConfirmModal = ({
    open,
    title,
    description,
    confirmLabel = "Confirmar",
    confirmClassName = "bg-red-600 hover:bg-red-700",
    onCancel,
    onConfirm,
    busy = false,
}) => {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 animate-pop">
                <h2 className="text-lg font-bold text-gray-800">{title}</h2>
                <div className="text-sm text-gray-600 mt-2">{description}</div>
                <div className="flex justify-end gap-3 pt-5">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition disabled:opacity-50 ${confirmClassName}`}
                    >
                        {busy ? "Procesando..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
