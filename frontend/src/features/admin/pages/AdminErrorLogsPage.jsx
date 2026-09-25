import { Link } from "react-router-dom";
import { useErrorLogs } from "@/features/admin/hooks/useErrorLogs";
import { useTestEmail } from "@/features/admin/hooks/useTestEmail";
import { SelectField } from "@/shared/components/ui/SelectField";
import { ResponsiveDataTable } from "@/shared/components/ResponsiveDataTable";
import { Pager } from "@/shared/components/Pager";
import { Button } from "@/shared/components/ui/Button";
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
    const [testEmailTo, setTestEmailTo] = useState("");
    const { running, result, error: testError, run } = useTestEmail();
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

            <section className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                    Diagnóstico de correo
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Envía un correo de prueba por el SMTP configurado y muestra el
                    error exacto del proveedor, sin necesidad de una shell en el
                    deploy.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                    <input
                        type="email"
                        value={testEmailTo}
                        onChange={(event) => setTestEmailTo(event.target.value)}
                        placeholder="Destinatario (opcional, por defecto tu correo)"
                        aria-label="Destinatario de la prueba de correo"
                        className="w-full sm:w-72 px-4 py-2 rounded-lg border border-gray-300 outline-none transition text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <Button
                        variant="primary"
                        size="sm"
                        loading={running}
                        disabled={running}
                        onClick={() => run(testEmailTo.trim())}
                    >
                        Probar envío de correo
                    </Button>
                </div>

                {testError && (
                    <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mt-3">
                        {testError}
                    </p>
                )}

                {result && (
                    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 grid gap-3">
                        <div className="flex items-center gap-2 text-sm">
                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    result.ok
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-red-50 text-red-700"
                                }`}
                            >
                                {result.ok ? "Envío exitoso" : "Envío fallido"}
                            </span>
                            {result.error_id && (
                                <span className="font-mono text-xs text-gray-400">
                                    {result.error_id}
                                </span>
                            )}
                        </div>

                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            {[
                                ["Configurado", result.configured ? "Sí" : "No"],
                                ["Backend", result.backend],
                                ["Host", result.host],
                                ["Puerto", String(result.port)],
                                ["TLS", result.tls ? "Sí" : "No"],
                                ["Usuario SMTP", result.user],
                                ["Remitente", result.from_email],
                                ["Destinatario", result.to],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <dt className="text-gray-400 text-xs uppercase tracking-wider">
                                        {label}
                                    </dt>
                                    <dd className="text-gray-700 font-mono text-xs break-words">
                                        {value || "—"}
                                    </dd>
                                </div>
                            ))}
                        </dl>

                        {!result.ok && result.error && (
                            <div className="border-t border-red-100 pt-3">
                                <p className="text-sm font-semibold text-red-700">
                                    {result.error_type || "Error"}
                                </p>
                                <p className="font-mono text-xs text-red-600 break-words mt-1">
                                    {result.error}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </section>

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