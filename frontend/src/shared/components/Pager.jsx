export const Pager = ({ page, totalPages, onChange, compact = false }) => {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center justify-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
          className="w-7 h-7 flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition disabled:opacity-40"
        >
          &lsaquo;
        </button>
        <span className="text-xs text-gray-500 tabular-nums">
          {page} - {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Página siguiente"
          className="w-7 h-7 flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition disabled:opacity-40"
        >
          &rsaquo;
        </button>
      </div>
    );
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
