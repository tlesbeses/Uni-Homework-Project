import { useEffect, useState } from "react";
import { useActivityLogs } from "@/features/admin/hooks/useActivityLogs";
import { useLoginStats } from "@/features/admin/hooks/useLoginStats";
import {
    actionLabel,
    actionStyle,
    activityDetailLines,
    entityTypeLabel,
    userName,
} from "@/shared/utils/activityMeta";
import { SelectField } from "@/shared/components/ui/SelectField";
import { Pager } from "@/shared/components/Pager";
import { ResponsiveDataTable } from "@/shared/components/ResponsiveDataTable";

const ROLE_BADGES = {
    Student: "bg-emerald-100 text-emerald-700",
    Teacher: "bg-indigo-100 text-indigo-700",
    Admin: "bg-amber-100 text-amber-700",
};

const ROLE_LABELS = {
    Student: "Estudiante",
    Teacher: "Profesor",
    Admin: "Administrador",
};

function formatDate(value) {
    if (!value) {
        return "—";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "—";
    }
    return date.toLocaleString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Formatea 'YYYY-MM-DD' sin pasar por Date.parse (evita el corrimiento de día
// por zona horaria al interpretar la fecha como medianoche UTC).
function formatDay(iso) {
    if (!iso) {
        return "—";
    }
    const [year, month, day] = iso.split("-").map(Number);
    if (!year || !month || !day) {
        return iso;
    }
    return new Date(year, month - 1, day).toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
}

const TABS = [
    { key: "activity", label: "Actividad" },
    { key: "logins", label: "Accesos" },
];

export const AdminActivityPage = () => {
    const [activeTab, setActiveTab] = useState("activity");
    const [action, setAction] = useState("");
    const [entityType, setEntityType] = useState("");
    const [userId, setUserId] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [debouncedUser, setDebouncedUser] = useState("");

    const loginsOnly = activeTab === "logins";

    const { stats: loginStats, loading: statsLoading, error: statsError } =
        useLoginStats(7);

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedUser(userId), 400);
        return () => clearTimeout(timeout);
    }, [userId]);

    const {
        logs,
        count,
        totalPages,
        loading,
        error,
        page,
        setPage,
        pageSize,
        handlePageSizeChange,
    } = useActivityLogs({
        action,
        entityType: loginsOnly ? "" : entityType,
        userId: debouncedUser,
        from,
        to,
        loginsOnly,
    });

    const hasFilters = loginsOnly
        ? Boolean(debouncedUser || from || to)
        : Boolean(action || entityType || debouncedUser || from || to);

    const clearFilters = () => {
        setAction("");
        setEntityType("");
        setUserId("");
        setFrom("");
        setTo("");
        setPage(1);
    };

    const switchTab = (tab) => {
        setActiveTab(tab);
        setPage(1);
    };

    const loginsColumns = [
        {
            key: "actor",
            header: "Usuario",
            role: "primary",
            render: (log) => (
                <>
                    <p className="font-medium text-gray-800">
                        {userName(log.actor) ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                        @{log.actor?.username}
                    </p>
                </>
            ),
        },
        {
            key: "roles",
            header: "Rol",
            role: "secondary",
            render: (log) => {
                const roles = log.metadata?.roles ?? [];
                return roles.length === 0 ? (
                    <span className="text-gray-400">—</span>
                ) : (
                    <div className="flex flex-wrap gap-1">
                        {roles.map((role) => (
                            <span
                                key={role}
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    ROLE_BADGES[role] ??
                                    "bg-gray-100 text-gray-700"
                                }`}
                            >
                                {ROLE_LABELS[role] ?? role}
                            </span>
                        ))}
                    </div>
                );
            },
        },
        {
            key: "created_at",
            header: "Fecha",
            role: "secondary",
            render: (log) => (
                <span className="whitespace-nowrap text-gray-600">
                    {formatDate(log.created_at)}
                </span>
            ),
        },
    ];

    const activityColumns = [
        {
            key: "action",
            header: "Acción",
            role: "primary",
            render: (log) => (
                <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${actionStyle(log.action)}`}
                >
                    {actionLabel(log.action)}
                </span>
            ),
        },
        {
            key: "entity_type",
            header: "Entidad",
            role: "secondary",
            render: (log) => (
                <span className="text-gray-600">
                    {entityTypeLabel(log.entity_type)}
                </span>
            ),
        },
        {
            key: "actor",
            header: "Actor",
            role: "primary",
            render: (log) => (
                <span className="text-gray-800">
                    {userName(log.actor) ?? "—"}
                </span>
            ),
        },
        {
            key: "target",
            header: "Objetivo",
            role: "secondary",
            render: (log) => (
                <span className="text-gray-800">
                    {userName(log.target) ?? "—"}
                </span>
            ),
        },
        {
            key: "detail",
            header: "Detalle",
            role: "optional",
            render: (log) =>
                activityDetailLines(log).length > 0 ? (
                    <ul className="space-y-0.5">
                        {activityDetailLines(log).map((line) => (
                            <li key={line}>{line}</li>
                        ))}
                    </ul>
                ) : (
                    <span className="text-gray-400">—</span>
                ),
        },
        {
            key: "created_at",
            header: "Fecha",
            role: "secondary",
            render: (log) => (
                <span className="whitespace-nowrap text-gray-600">
                    {formatDate(log.created_at)}
                </span>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Actividad
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Historial de eventos del sistema: impersonaciones,
                        calificaciones y cambios en cursos, grupos y tareas.
                    </p>
                </div>
                <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 self-start">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => switchTab(tab.key)}
                            aria-pressed={activeTab === tab.key}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                activeTab === tab.key
                                    ? "bg-indigo-600 text-white"
                                    : "text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {loginsOnly && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700">
                            Accesos (últimos {loginStats?.days ?? 7} días)
                        </h2>
                        <span className="text-xs text-gray-400">
                            Los logins se conservan 30 días
                        </span>
                    </div>

                    {statsLoading && !loginStats && (
                        <p className="text-sm text-gray-400">
                            Cargando métricas de acceso...
                        </p>
                    )}
                    {statsError && !loginStats && (
                        <p className="text-sm text-red-600">
                            No se pudieron cargar las métricas: {statsError}
                        </p>
                    )}

                    {loginStats && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-indigo-50 rounded-lg px-4 py-3">
                                    <p className="text-3xl font-bold text-indigo-700">
                                        {loginStats.totals.logins}
                                    </p>
                                    <p className="text-xs text-indigo-500">
                                        Logins totales
                                    </p>
                                </div>
                                <div className="bg-emerald-50 rounded-lg px-4 py-3">
                                    <p className="text-3xl font-bold text-emerald-700">
                                        {loginStats.totals.unique_users}
                                    </p>
                                    <p className="text-xs text-emerald-500">
                                        Usuarios únicos que entraron
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                                            <th className="pb-2">Día</th>
                                            <th className="pb-2">Logins</th>
                                            <th className="pb-2">
                                                Usuarios únicos
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loginStats.per_day.map((day) => (
                                            <tr key={day.date}>
                                                <td className="py-2 text-gray-700">
                                                    {formatDay(day.date)}
                                                </td>
                                                <td className="py-2 text-gray-800">
                                                    {day.logins}
                                                </td>
                                                <td className="py-2 text-gray-800">
                                                    {day.unique_users}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {loginsOnly && (
                <p className="text-xs text-gray-400">
                    Detalle de inicios de sesión registrados en el historial.
                </p>
            )}

            <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${
                    loginsOnly ? "lg:grid-cols-3" : "lg:grid-cols-5"
                }`}
            >
                {!loginsOnly && (
                    <>
                        <SelectField
                            compact
                            value={action}
                            onChange={(event) => {
                                setAction(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Filtrar por acción"
                        >
                            <option value="">Todas las acciones</option>
                            <option value="impersonate">Impersonación</option>
                            <option value="update">Actualización</option>
                            <option value="create">Creación</option>
                            <option value="delete">Eliminación</option>
                        </SelectField>
                        <SelectField
                            compact
                            value={entityType}
                            onChange={(event) => {
                                setEntityType(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Filtrar por entidad"
                        >
                            <option value="">Todas las entidades</option>
                            <option value="user">Usuario</option>
                            <option value="grade">Nota</option>
                            <option value="course">Curso</option>
                        </SelectField>
                    </>
                )}
                <input
                    type="text"
                    value={userId}
                    onChange={(event) => {
                        setUserId(event.target.value);
                        setPage(1);
                    }}
                    placeholder="ID de usuario"
                    aria-label="Filtrar por ID de usuario"
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <input
                    type="date"
                    value={from}
                    onChange={(event) => {
                        setFrom(event.target.value);
                        setPage(1);
                    }}
                    aria-label="Desde"
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <input
                    type="date"
                    value={to}
                    onChange={(event) => {
                        setTo(event.target.value);
                        setPage(1);
                    }}
                    aria-label="Hasta"
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
            </div>

            {hasFilters && (
                <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                    Limpiar filtros
                </button>
            )}

            {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    {error}
                </p>
            )}

            <ResponsiveDataTable
                columns={loginsOnly ? loginsColumns : activityColumns}
                rows={logs}
                rowKey={(log) => log.id}
                loading={loading && logs.length === 0}
                loadingContent={
                    loginsOnly ? "Cargando accesos..." : "Cargando actividad..."
                }
                emptyContent={
                    loginsOnly
                        ? "No se encontraron accesos registrados."
                        : "No se encontraron eventos de actividad."
                }
                ariaLabel={loginsOnly ? "Accesos" : "Actividad"}
                rowClassName={() => "hover:bg-indigo-50/40 transition"}
            />

            {!loading && count > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-gray-500">
                        {count} registro{count !== 1 ? "s" : ""}
                    </p>
                    <Pager
                        page={page}
                        totalPages={totalPages}
                        onChange={setPage}
                        pageSize={pageSize}
                        onPageSizeChange={handlePageSizeChange}
                        defaultPageSize={15}
                    />
                </div>
            )}
        </div>
    );
};