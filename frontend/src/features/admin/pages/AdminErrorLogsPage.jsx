import { Link } from "react-router-dom";
import { useErrorLogs } from "@/features/admin/hooks/useErrorLogs";
import { SelectField } from "@/shared/components/ui/SelectField";
import { ResponsiveDataTable } from "@/shared/components/ResponsiveDataTable";
import { Pager } from "@/shared/components/Pager";
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
    const { logs, count, totalPages, loading, error, page, setPage, pageSize, handlePageSizeChange } = useErrorLogs({
        source,
    });

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
                <SelectField
                    compact
                    value={source}
                    onChange={(event) => {
                        setSource(event.target.value);
                        setPage(1);
                    }}
                    aria-label="Filtrar por fuente"
                >
                    <option value="">Todas las fuentes</option>
                    <option value="server">Servidor</option>
                    <option value="client">Frontend</option>
                </SelectField>
                <span className="text-sm text-gray-400">
                    {count} error{count !== 1 ? "es" : ""}
                </span>
            </div>

            {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    {error}
                </p>
            )}

            <ResponsiveDataTable
                ariaLabel="Errores registrados"
                columns={[
                    {
                        key: "error_id",
                        header: "Código",
                        role: "primary",
                        render: (log) => (
                            <Link
                                to={`/admin/errors/${log.id}`}
                                className="font-mono text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                                {log.error_id}
                            </Link>
                        ),
                    },
                    {
                        key: "source",
                        header: "Fuente",
                        role: "secondary",
                        render: (log) => (
                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sourceStyle(log.source)}`}
                            >
                                {sourceLabel(log.source)}
                            </span>
                        ),
                    },
                    {
                        key: "kind",
                        header: "Tipo",
                        role: "secondary",
                        className: "text-gray-800",
                        render: (log) => log.kind || "—",
                    },
                    {
                        key: "message",
                        header: "Mensaje",
                        role: "secondary",
                        className: "text-gray-700 max-w-xs truncate",
                        render: (log) => log.message || "—",
                    },
                    {
                        key: "path",
                        header: "Ruta",
                        role: "optional",
                        className: "text-gray-500 max-w-[10rem] truncate",
                        render: (log) => log.path || "—",
                    },
                    {
                        key: "user_id",
                        header: "Usuario",
                        role: "optional",
                        className: "text-gray-600",
                        render: (log) => log.user_id ?? "—",
                    },
                    {
                        key: "created_at",
                        header: "Fecha",
                        role: "primary",
                        className: "text-gray-600 whitespace-nowrap",
                        render: (log) => formatDate(log.created_at),
                    },
                ]}
                rows={logs}
                rowKey={(log) => log.id}
                rowClassName={() => "hover:bg-indigo-50/40 transition"}
                actions={() => [
                    {
                        key: "detail",
                        label: "Ver detalle",
                        href: (log) => `/admin/errors/${log.id}`,
                        variant: "outline",
                        size: "sm",
                        tableVisibility: "mobile",
                    },
                ]}
                loading={loading && logs.length === 0}
                loadingContent="Cargando errores..."
                emptyContent="No se encontraron errores registrados."
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