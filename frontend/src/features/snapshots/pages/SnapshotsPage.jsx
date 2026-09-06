import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSnapshots } from "@/features/snapshots/hooks/useSnapshots";

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
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timeout);
    }, [search]);

    const { snapshots, count, loading, error, page, setPage } = useSnapshots({
        search: debouncedSearch,
    });

    const totalPages = Math.max(1, Math.ceil(count / 15));

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
                    <button
                        type="button"
                        onClick={() => {
                            setSearch("");
                            setPage(1);
                        }}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                        Limpiar búsqueda
                    </button>
                )}
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
                            <th className="px-5 py-3">Curso</th>
                            <th className="px-5 py-3">Grupo</th>
                            <th className="px-5 py-3">Profesor</th>
                            <th className="px-5 py-3">Motivo</th>
                            <th className="px-5 py-3">Datos</th>
                            <th className="px-5 py-3">Fecha</th>
                            <th className="px-5 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && snapshots.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-5 py-10 text-center text-gray-400"
                                >
                                    Cargando snapshots...
                                </td>
                            </tr>
                        )}
                        {!loading && snapshots.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-5 py-10 text-center text-gray-400"
                                >
                                    No hay grupos borrados para mostrar.
                                </td>
                            </tr>
                        )}
                        {snapshots.map((snapshot) => (
                            <tr
                                key={snapshot.id}
                                className="hover:bg-gray-50 transition"
                            >
                                <td className="px-5 py-3 text-gray-800 font-medium">
                                    {snapshot.course_title}
                                </td>
                                <td className="px-5 py-3 text-gray-600">
                                    {snapshot.section_name}
                                </td>
                                <td className="px-5 py-3 text-gray-600">
                                    {snapshot.teacher_name}
                                </td>
                                <td className="px-5 py-3">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                            snapshot.reason === "course_delete"
                                                ? "bg-red-50 text-red-700"
                                                : "bg-amber-50 text-amber-700"
                                        }`}
                                    >
                                        {reasonLabel(snapshot.reason)}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-gray-600">
                                    {snapshot.stats
                                        ? `${snapshot.stats.approved_students ?? 0} alumnos · ${snapshot.stats.teams ?? 0} equipos · ${snapshot.stats.assignments ?? 0} tareas`
                                        : "—"}
                                </td>
                                <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                                    {formatDate(snapshot.created_at)}
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <Link
                                        to={`/snapshots/${snapshot.id}`}
                                        className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                    >
                                        Ver
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {!loading && count > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        {count} grupo{count !== 1 ? "s" : ""} borrado
                        {count !== 1 ? "s" : ""}
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