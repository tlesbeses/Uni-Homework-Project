import { Link } from "react-router-dom";
import { useErrorLogs } from "@/features/admin/hooks/useErrorLogs";
import { useState } from "react";

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

const sourceLabel = (source) =>
    source === "server" ? "Servidor" : source === "client" ? "Frontend" : source;

const sourceStyle = (source) =>
    source === "server"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";

export const AdminErrorLogsPage = () => {
    const [source, setSource] = useState("");
    const { logs, count, loading, error, page, setPage } = useErrorLogs({
        source,
    });

    const totalPages = Math.max(1, Math.ceil(count / 15));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Errores</h1>
                <p className="text-gray-500 mt-1 text-sm">
                    Excepciones del servidor y errores no controlados del
                    frontend, con un código de soporte público por error.
                </p>
            </div>

            <div className="flex items-center gap-3">
                <select
                    value={source}
                    onChange={(event) => {
                        setSource(event.target.value);
                        setPage(1);
                    }}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                    <option value="">Todas las fuentes</option>
                    <option value="server">Servidor</option>
                    <option value="client">Frontend</option>
                </select>
                <span className="text-sm text-gray-400">
                    {count} error{count !== 1 ? "es" : ""}
                </span>
            </div>

            {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    {error}
                </p>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                            <th className="px-5 py-3">Código</th>
                            <th className="px-5 py-3">Fuente</th>
                            <th className="px-5 py-3">Tipo</th>
                            <th className="px-5 py-3">Mensaje</th>
                            <th className="px-5 py-3">Ruta</th>
                            <th className="px-5 py-3">Usuario</th>
                            <th className="px-5 py-3">Fecha</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && logs.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-5 py-10 text-center text-gray-400"
                                >
                                    Cargando errores...
                                </td>
                            </tr>
                        )}
                        {!loading && logs.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-5 py-10 text-center text-gray-400"
                                >
                                    No se encontraron errores registrados.
                                </td>
                            </tr>
                        )}
                        {logs.map((log) => (
                            <tr
                                key={log.id}
                                className="hover:bg-indigo-50/40 transition"
                            >
                                <td className="px-5 py-3">
                                    <Link
                                        to={`/admin/errors/${log.id}`}
                                        className="font-mono text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                                    >
                                        {log.error_id}
                                    </Link>
                                </td>
                                <td className="px-5 py-3">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sourceStyle(log.source)}`}
                                    >
                                        {sourceLabel(log.source)}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-gray-800">
                                    {log.kind || "—"}
                                </td>
                                <td className="px-5 py-3 text-gray-700 max-w-xs truncate">
                                    {log.message || "—"}
                                </td>
                                <td className="px-5 py-3 text-gray-500 max-w-[10rem] truncate">
                                    {log.path || "—"}
                                </td>
                                <td className="px-5 py-3 text-gray-600">
                                    {log.user_id ?? "—"}
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