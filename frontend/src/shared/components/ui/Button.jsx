const VARIANTS = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500 shadow",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-indigo-500",
    outline: "text-indigo-600 border border-indigo-200 hover:bg-indigo-50 focus-visible:ring-indigo-500",
    soft: "text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus-visible:ring-indigo-500",
    neutral: "text-gray-700 bg-gray-100 hover:bg-gray-200 focus-visible:ring-gray-400",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow",
    dangerSoft: "text-red-600 border border-red-200 hover:bg-red-50 focus-visible:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500 shadow",
    successSoft: "text-emerald-600 border border-emerald-200 hover:bg-emerald-50 focus-visible:ring-emerald-500",
    ghost: "text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-400",
    link: "text-indigo-600 hover:text-indigo-800 hover:underline focus-visible:ring-indigo-500",
    linkDanger: "text-red-600 hover:text-red-800 hover:underline focus-visible:ring-red-500",
};

const SIZES = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base",
};

const BASE =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 whitespace-nowrap active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

export const Button = ({
    as: Tag = "button",
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    className = "",
    children,
    ...rest
}) => {
    const classes = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
    const isButton = Tag === "button";

    if (!isButton) {
        return (
            <Tag
                className={`${classes} ${disabled ? "opacity-50 pointer-events-none" : ""}`}
                aria-disabled={disabled || undefined}
                {...rest}
            >
                {children}
            </Tag>
        );
    }

    return (
        <button
            type={rest.type ?? "button"}
            disabled={disabled || loading}
            className={classes}
            {...rest}
        >
            {loading && (
                <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
                    />
                </svg>
            )}
            {children}
        </button>
    );
};