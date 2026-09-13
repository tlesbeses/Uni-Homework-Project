import { useId, useState } from "react";
import { Link } from "react-router-dom";
import {
    BUTTON_SIZES,
    BUTTON_VARIANTS,
} from "@/shared/components/ui/Button";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";

const DESKTOP_BREAKPOINT = "(min-width: 768px)";

const BUTTON_BASE =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed";

function actionClasses(action, defaultSize = "sm") {
    const classes = [BUTTON_BASE];
    if (action.variant) {
        classes.push(BUTTON_VARIANTS[action.variant] ?? "");
    }
    if (action.size) {
        classes.push(BUTTON_SIZES[action.size] ?? "");
    }
    if (action.className) {
        classes.push(action.className);
    }
    if (!action.variant && !action.size && !action.className) {
        classes.push(BUTTON_VARIANTS.primary, BUTTON_SIZES[defaultSize]);
    }
    return classes.filter(Boolean).join(" ");
}

function renderAction(action, row) {
    const label = typeof action.label === "function" ? action.label(row) : action.label;
    const className = actionClasses(action);
    if (action.href) {
        return (
            <Link key={action.key} to={action.href(row)} className={className}>
                {label}
            </Link>
        );
    }
    return (
        <button
            key={action.key}
            type="button"
            disabled={
                (typeof action.disabled === "function"
                    ? action.disabled(row)
                    : action.disabled) || false
            }
            onClick={() => action.onClick(row)}
            className={className}
        >
            {label}
        </button>
    );
}

function OptionalFields({ fields, row, label = "Ver detalles" }) {
    const [open, setOpen] = useState(false);
    const regionId = useId();
    return (
        <div className="mt-3">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={regionId}
                onClick={() => setOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded text-sm font-medium text-indigo-600 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
                {label}
                <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                >
                    <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>
            <dl
                id={regionId}
                className={`mt-1 space-y-1 ${open ? "" : "hidden"}`}
            >
                {fields.map((column) => (
                    <div
                        key={column.key}
                        className="flex items-baseline justify-between gap-3 text-sm"
                    >
                        <dt className="text-gray-400">{column.header}</dt>
                        <dd className="text-gray-700">{column.render(row)}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

const byRole = (role) => (column) => (column.role ?? "primary") === role;

export const ResponsiveDataTable = ({
    columns,
    rows,
    rowKey,
    actions,
    noActionsLabel,
    loading = false,
    loadingContent = "Cargando...",
    emptyContent = "No hay datos.",
    ariaLabel,
    className = "",
    rowClassName,
}) => {
    const isDesktop = useMediaQuery(DESKTOP_BREAKPOINT);
    const primaryColumns = columns.filter(byRole("primary"));
    const secondaryColumns = columns.filter(byRole("secondary"));
    const optionalColumns = columns.filter(byRole("optional"));

    if (isDesktop) {
        const hasDesktopActions = rows.some(
            (row) =>
                (actions?.(row) ?? []).some(
                    (action) => (action.tableVisibility ?? "always") !== "mobile",
                ),
        );
        const colSpan = columns.length + (hasDesktopActions ? 1 : 0);

        return (
            <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
                <table className="min-w-full divide-y divide-gray-100 text-sm" aria-label={ariaLabel}>
                    <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`px-5 py-3 ${column.headerClassName ?? ""}`}
                                >
                                    {column.header}
                                </th>
                            ))}
                            {hasDesktopActions && (
                                <th className="px-5 py-3 text-right">Acciones</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={colSpan}
                                    className="px-5 py-10 text-center text-gray-400"
                                >
                                    {loading ? loadingContent : emptyContent}
                                </td>
                            </tr>
                        )}
                        {rows.map((row) => {
                            const rowActions = actions?.(row) ?? [];
                            const desktopActions = rowActions.filter(
                                (action) =>
                                    (action.tableVisibility ?? "always") !== "mobile",
                            );
                            return (
                                <tr
                                    key={rowKey(row)}
                                    className={rowClassName?.(row) ?? ""}
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className={`px-5 py-3 ${column.className ?? ""}`}
                                        >
                                            {column.render(row)}
                                        </td>
                                    ))}
                                    {hasDesktopActions && (
                                        <td className="px-5 py-3">
                                            {desktopActions.length > 0 ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    {desktopActions.map((action) =>
                                                        renderAction(action, row),
                                                    )}
                                                </div>
                                            ) : (
                                                noActionsLabel && (
                                                    <p className="text-right text-xs text-gray-400">
                                                        {noActionsLabel}
                                                    </p>
                                                )
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
            <ul role="list" className="grid gap-3 p-4" aria-label={ariaLabel}>
                {rows.length === 0 && (
                    <li className="col-span-full px-4 py-10 text-center text-gray-400">
                        {loading ? loadingContent : emptyContent}
                    </li>
                )}
                {rows.map((row) => {
                    const rowActions = actions?.(row) ?? [];
                    return (
                        <li
                            key={rowKey(row)}
                            className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm ${rowClassName?.(row) ?? ""}`}
                        >
                            {primaryColumns.length > 0 && (
                                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                                    {primaryColumns.map((column) => (
                                        <div key={column.key}>
                                            {column.render(row)}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {secondaryColumns.length > 0 && (
                                <dl className="mt-3 space-y-1">
                                    {secondaryColumns.map((column) => (
                                        <div
                                            key={column.key}
                                            className="flex items-baseline justify-between gap-3 text-sm"
                                        >
                                            <dt className="text-gray-400">{column.header}</dt>
                                            <dd className="text-gray-700">
                                                {column.render(row)}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                            {optionalColumns.length > 0 && (
                                <OptionalFields
                                    fields={optionalColumns}
                                    row={row}
                                />
                            )}
                            {rowActions.length > 0 && (
                                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                                    {rowActions.map((action) =>
                                        renderAction(action, row),
                                    )}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};