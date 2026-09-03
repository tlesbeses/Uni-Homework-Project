const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [25, 50, 100];

const ResetPageSizeButton = ({ onClick, defaultSize }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Restablecer registros por página"
    title={`Restablecer a ${defaultSize} por página`}
    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
  >
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  </button>
);

const buildPageSizeOptions = (defaultSize) =>
  [defaultSize, ...PAGE_SIZE_OPTIONS.filter((size) => size > defaultSize)]
    .filter((size, index, arr) => arr.indexOf(size) === index)
    .sort((a, b) => a - b);

const PageSizeSelect = ({ pageSize, onPageSizeChange, defaultSize, compact = false }) => {
  const options = buildPageSizeOptions(defaultSize);

  return (
    <label className="flex items-center gap-1 text-xs text-gray-500">
      <span className={compact ? "sr-only" : ""}>Por página</span>
      <select
        value={pageSize}
        onChange={(event) => onPageSizeChange(Number(event.target.value))}
        className="appearance-none rounded-md border border-gray-200 bg-white px-2 py-0.5 font-medium text-sm text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
        aria-label="Registros por página"
        title="Registros por página"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  );
};

export const Pager = ({
  page,
  totalPages,
  onChange,
  compact = false,
  pageSize,
  onPageSizeChange,
  defaultPageSize = DEFAULT_PAGE_SIZE,
}) => {
  const hasPageSize = typeof onPageSizeChange === "function";

  if (!totalPages || totalPages <= 1) {
    if (!hasPageSize || pageSize === defaultPageSize) {
      return null;
    }
    return (
      <div
        className={`flex items-center justify-center ${
          compact ? "pt-1" : "pt-2"
        }`}
      >
        <ResetPageSizeButton
          onClick={() => onPageSizeChange(defaultPageSize)}
          defaultSize={defaultPageSize}
        />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center justify-center gap-1 pt-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
          className="w-7 h-7 flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition disabled:opacity-40"
        >
          &lsaquo;
        </button>
        <span className="px-1 text-xs font-medium text-gray-600 tabular-nums min-w-[2.75rem] text-center select-none">
          {page} / {totalPages}
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
        {hasPageSize && (
          <>
            <span className="w-px h-5 bg-gray-200 mx-1.5" aria-hidden="true" />
            <div className="flex items-center gap-1">
              <PageSizeSelect
                pageSize={pageSize}
                onPageSizeChange={onPageSizeChange}
                defaultSize={defaultPageSize}
                compact
              />
              {pageSize !== defaultPageSize && (
                <ResetPageSizeButton
                  onClick={() => onPageSizeChange(defaultPageSize)}
                  defaultSize={defaultPageSize}
                />
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
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
      {hasPageSize && (
        <div className="flex items-center gap-1">
          <PageSizeSelect
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            defaultSize={defaultPageSize}
          />
          {pageSize !== defaultPageSize && (
            <ResetPageSizeButton
              onClick={() => onPageSizeChange(defaultPageSize)}
              defaultSize={defaultPageSize}
            />
          )}
        </div>
      )}
    </div>
  );
};