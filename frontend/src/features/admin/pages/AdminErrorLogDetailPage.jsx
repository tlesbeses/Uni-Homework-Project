import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useErrorDetail } from "@/features/admin/hooks/useErrorDetail";

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

export const AdminErrorLogDetailPage = () => {
    const { id } = useParams();
    const { errorLog: log, loading, error } = useErrorDetail(id);
    const [copied, setCopied] = useState(false);

    if (loading) {
        return (
            <div className="text-center text-gray-400 py-16">
                Cargando error...
            </div>
        );
    }

    if (error) {
        return (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
            </p>
        );
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(log.error_id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <Link
                    to="/admin/errors"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                    ← Volver a errores
                </Link>
                <div className="mt-2 flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-800">
                        Error{" "}
                        <span className="font-mono text-indigo-600">
                            {log.error_id}
                        </span>
                    </h1>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="px-3 py-1 rounded-lg text-xs font-medium text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition"
                    >
                        {copied ? "Copiado" : "Copiar código"}
                    </button>
                </div>
                <p className="text-gray-500 mt-1 text-sm">
                    Detalle del error para diagnósticos.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Fuente
                    </p>
                    <p className="mt-1 text-sm text-gray-800">
                        {sourceLabel(log.source)}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Tipo
                    </p>
                    <p className="mt-1 text-sm text-gray-800 break-words">
                        {log.kind || "—"}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        HTTP
                    </p>
                    <p className="mt-1 text-sm text-gray-800">
                        {log.status_code ?? "—"}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Fecha
                    </p>
                    <p className="mt-1 text-sm text-gray-800">
                        {formatDate(log.created_at)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Ruta
                    </p>
                    <p className="mt-1 text-sm text-gray-800 break-words">
                        {log.path ? `${log.method || ""} ${log.path}` : "—"}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Usuario
                    </p>
                    <p className="mt-1 text-sm text-gray-800">
                        {log.user_id ?? "—"}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Mensaje
                </p>
                <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap break-words">
                    {log.message || "—"}
                </p>
            </div>

            {log.error_id_ref && (
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Referencia del otro extremo
                    </p>
                    <p className="mt-1 font-mono text-sm text-gray-800">
                        {log.error_id_ref}
                    </p>
                </div>
            )}

            {log.client_metadata && (
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Metadata del cliente
                    </p>
                    <pre className="mt-2 text-xs text-gray-700 bg-slate-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
                        {JSON.stringify(log.client_metadata, null, 2)}
                    </pre>
                </div>
            )}

            {log.traceback && (
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Traceback
                    </p>
                    <pre className="mt-2 text-xs text-gray-700 bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
                        {log.traceback}
                    </pre>
                </div>
            )}
        </div>
    );
};