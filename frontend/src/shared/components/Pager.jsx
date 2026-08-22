export const Pager = ({ page, totalPages, onChange }) => {
    if (!totalPages || totalPages <= 1) {
        return null;
    }

    return (
        <div className="flex items-center justify-center gap-4 pt-2">
            <button
                type="button"
                onClick={() => onChange(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
                &larr; Anterior
            </button>
            <span className="text-sm text-gray-600">
                Página {page} de {totalPages}
            </span>
            <button
                type="button"
                onClick={() => onChange(page + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
                Siguiente &rarr;
            </button>
        </div>
    );
};
