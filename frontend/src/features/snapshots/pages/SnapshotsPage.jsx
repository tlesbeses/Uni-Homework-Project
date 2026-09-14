import { useState } from "react";
import { useSnapshots } from "@/features/snapshots/hooks/useSnapshots";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { Button } from "@/shared/components/ui/Button";
import { Pager } from "@/shared/components/Pager";
import { ResponsiveDataTable } from "@/shared/components/ResponsiveDataTable";

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

const reasonLabel = (reason) =>
    reason === "course_delete" ? "Curso borrado" : "Grupo borrado";

export const SnapshotsPage = () => {
    const [search, setSearch] = useState("");

    const debouncedSearch = useDebouncedValue(search);

    const { snapshots, count, totalPages, loading, error, page, setPage, pageSize, handlePageSizeChange } =
        useSnapshots({
            search: debouncedSearch,
        });

    const columns = [
        {
            key: "course_title",
            header: "Curso",
            role: "primary",
            render: (snapshot) => (
                <span className="font-medium text-gray-800">
                    {snapshot.course_title}
                </span>
            ),
        },
        {
            key: "section_name",
            header: "Grupo",
            role: "primary",
            render: (snapshot) => (
                <span className="text-gray-600">{snapshot.section_name}</span>
            ),
        },
        {
            key: "teacher_name",
            header: "Profesor",
            role: "secondary",
            render: (snapshot) => (
                <span className="text-gray-600">{snapshot.teacher_name}</span>
            ),
        },
        {
            key: "reason",
            header: "Motivo",
            role: "secondary",
            render: (snapshot) => (
                <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        snapshot.reason === "course_delete"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                    }`}
                >
                    {reasonLabel(snapshot.reason)}
                </span>
            ),
        },
        {
            key: "stats",
            header: "Datos",
            role: "optional",
            render: (snapshot) =>
                snapshot.stats
                    ? `${snapshot.stats.approved_students ?? 0} alumnos · ${snapshot.stats.teams ?? 0} equipos · ${snapshot.stats.assignments ?? 0} tareas`
                    : "—",
        },
        {
            key: "created_at",
            header: "Fecha",
            role: "secondary",
            render: (snapshot) => (
                <span className="whitespace-nowrap text-gray-600">
                    {formatDate(snapshot.created_at)}
                </span>
            ),
        },
    ];

    const actionsFor = (snapshot) => [
        {
            key: "view",
            label: "Ver",
            href: () => `/snapshots/${snapshot.id}`,
            variant: "outline",
            size: "sm",
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    Histórico de grupos
                </h1>
                <p className="text-gray-500 mt-1 text-sm">
                    Grupos borrados con sus datos congelados: estudiantes,
                    equipos, tareas y notas al momento de la eliminación.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                    }}
                    placeholder="Buscar por curso, grupo o profesor..."
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none max-w-md"
                />
                {debouncedSearch && (
                    <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                            setSearch("");
                            setPage(1);
                        }}
                    >
                        Limpiar búsqueda
                    </Button>
                )}
            </div>

            {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    {error}
                </p>
            )}

            <ResponsiveDataTable
                columns={columns}
                rows={snapshots}
                rowKey={(snapshot) => snapshot.id}
                actions={actionsFor}
                loading={loading && snapshots.length === 0}
                loadingContent="Cargando snapshots..."
                emptyContent="No hay grupos borrados para mostrar."
                ariaLabel="Grupos borrados"
                rowClassName={() => "hover:bg-indigo-50/40 transition"}
            />

            {!loading && count > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-gray-500">
                        {count} grupo{count !== 1 ? "s" : ""} borrado
                        {count !== 1 ? "s" : ""}
                    </p>
                    <Pager
                        page={page}
                        totalPages={totalPages}
                        onChange={setPage}
                        pageSize={pageSize}
                        onPageSizeChange={handlePageSizeChange}
                        defaultPageSize={9}
                    />
                </div>
            )}
        </div>
    );
};