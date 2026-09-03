import { useEffect, useState } from "react";
import { useActivityLogs } from "@/features/admin/hooks/useActivityLogs";

const ACTION_LABELS = {
    impersonate: "Impersonación",
    update: "Actualización",
    create: "Creación",
    delete: "Eliminación",
    login: "Inicio de sesión",
};

const ACTION_STYLES = {
    impersonate: "bg-violet-100 text-violet-700",
    update: "bg-sky-100 text-sky-700",
    create: "bg-emerald-100 text-emerald-700",
    delete: "bg-red-100 text-red-700",
    login: "bg-amber-100 text-amber-700",
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

function userName(user) {
    if (!user) {
        return "—";
    }
    return user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.username;
}

export const AdminActivityPage = () => {
    const [action, setAction] = useState("");
    const [entityType, setEntityType] = useState("");
    const [userId, setUserId] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [debouncedUser, setDebouncedUser] = useState("");

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
                    Historial de eventos del sistema: impersonaciones y
                    calificaciones registradas.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <select
                    value={action}
                    onChange={(event) => {
                        setAction(event.target.value);
                        setPage(1);
                    }}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                    <option value="">Todas las acciones</option>
                    <option value="impersonate">Impersonación</option>
                    <option value="update">Actualización</option>
                    <option value="create">Creación</option>
                    <option value="delete">Eliminación</option>
                    <option value="login">Inicio de sesión</option>
                </select>
                <select
                    value={entityType}
                    onChange={(event) => {
                        setEntityType(event.target.value);
                        setPage(1);
                    }}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                    <option value="">Todas las entidades</option>
                    <option value="user">Usuario</option>
                    <option value="grade">Nota</option>
                    <option value="course">Curso</option>
                </select>
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
                            <th className="px-5 py-3">Fecha</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && logs.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-5 py-10 text-center text-gray-400"
                                >
                                    Cargando actividad...
                                </td>
                            </tr>
                        )}
                        {!loading && logs.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
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
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                            ACTION_STYLES[log.action] ??
                                            "bg-gray-100 text-gray-700"
                                        }`}
                                    >
                                        {ACTION_LABELS[log.action] ?? log.action}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-gray-600">
                                    {log.entity_type || "—"}
                                </td>
                                <td className="px-5 py-3 text-gray-800">
                                    {userName(log.actor)}
                                </td>
                                <td className="px-5 py-3 text-gray-800">
                                    {userName(log.target)}
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
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Anterior
                        </button>
                        <span className="text-sm text-gray-500">
                            Página {page} de {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() =>
                                setPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={page >= totalPages}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
