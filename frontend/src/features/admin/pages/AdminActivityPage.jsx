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
import { Button } from "@/shared/components/ui/Button";
import { SelectField } from "@/shared/components/ui/SelectField";

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

export const AdminActivityPage = () => {
    const [action, setAction] = useState("");
    const [entityType, setEntityType] = useState("");
    const [userId, setUserId] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [debouncedUser, setDebouncedUser] = useState("");

    const { stats: loginStats, loading: statsLoading, error: statsError } =
        useLoginStats(7);

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedUser(userId), 400);
        return () => clearTimeout(timeout);
    }, [userId]);

    const {
        logs,
        count,
        loading,
        error,
        page,
        setPage,
    } = useActivityLogs({
        action,
        entityType,
        userId: debouncedUser,
        from,
        to,
    });

    const hasFilters = Boolean(
        action || entityType || debouncedUser || from || to
    );
    const totalPages = Math.max(1, Math.ceil(count / 15));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Actividad</h1>
                <p className="text-gray-500 mt-1 text-sm">
                    Historial de eventos del sistema: impersonaciones,
                    calificaciones e inicios de sesión registrados.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700">
                        Accesos (últimos {loginStats?.days ?? 7} días)
                    </h2>
                    <span className="text-xs text-gray-400">
                        Basado en los logins registrados en el historial
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
                                        <th className="pb-2">Usuarios únicos</th>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
                    <option value="login">Inicio de sesión</option>
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
                <input
                    type="text"
                    value={userId}
                    onChange={(event) => {
                        setUserId(event.target.value);
                        setPage(1);
                    }}
                    placeholder="ID de usuario"
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <input
                    type="date"
                    value={from}
                    onChange={(event) => {
                        setFrom(event.target.value);
                        setPage(1);
                    }}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <input
                    type="date"
                    value={to}
                    onChange={(event) => {
                        setTo(event.target.value);
                        setPage(1);
                    }}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
            </div>

            {hasFilters && (
                <button
                    type="button"
                    onClick={() => {
                        setAction("");
                        setEntityType("");
                        setUserId("");
                        setFrom("");
                        setTo("");
                        setPage(1);
                    }}
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                            <th className="px-5 py-3">Acción</th>
                            <th className="px-5 py-3">Entidad</th>
                            <th className="px-5 py-3">Actor</th>
                            <th className="px-5 py-3">Objetivo</th>
                            <th className="px-5 py-3">Detalle</th>
                            <th className="px-5 py-3">Fecha</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && logs.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-5 py-10 text-center text-gray-400"
                                >
                                    Cargando actividad...
                                </td>
                            </tr>
                        )}
                        {!loading && logs.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-5 py-10 text-center text-gray-400"
                                >
                                    No se encontraron eventos de actividad.
                                </td>
                            </tr>
                        )}
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td className="px-5 py-3">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${actionStyle(log.action)}`}
                                    >
                                        {actionLabel(log.action)}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-gray-600">
                                    {entityTypeLabel(log.entity_type)}
                                </td>
                                <td className="px-5 py-3 text-gray-800">
                                    {userName(log.actor) ?? "—"}
                                </td>
                                <td className="px-5 py-3 text-gray-800">
                                    {userName(log.target) ?? "—"}
                                </td>
                                <td className="px-5 py-3 text-gray-700">
                                    {activityDetailLines(log).length > 0 ? (
                                        <ul className="space-y-0.5">
                                            {activityDetailLines(log).map((line) => (
                                                <li key={line}>{line}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span className="text-gray-400">—</span>
                                    )}
                                </td>
                                <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                                    {formatDate(log.created_at)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {!loading && count > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        {count} registro{count !== 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            size="sm"
                            variant="outline"
                        >
                            Anterior
                        </Button>
                        <span className="text-sm text-gray-500">
                            Página {page} de {totalPages}
                        </span>
                        <Button
                            onClick={() =>
                                setPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={page >= totalPages}
                            size="sm"
                            variant="outline"
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
