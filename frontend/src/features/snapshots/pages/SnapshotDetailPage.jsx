import { useState } from "react";
import { useParams } from "react-router-dom";
import {
    exportSnapshotGrades,
    exportSnapshotGradesCsv,
} from "@/features/snapshots/services/snapshotService";
import { useSnapshot } from "@/features/snapshots/hooks/useSnapshot";

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

function formatDateOnly(value) {
    if (!value) {
        return "—";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "—";
    }
    return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

const statusLabel = (status) =>
    status === "APPROVED"
        ? "Aprobado"
        : status === "REJECTED"
            ? "Rechazado"
            : "Pendiente";

const statusStyle = (status) =>
    status === "APPROVED"
        ? "bg-emerald-50 text-emerald-700"
        : status === "REJECTED"
            ? "bg-red-50 text-red-700"
            : "bg-amber-50 text-amber-700";

const reasonLabel = (reason) =>
    reason === "course_delete" ? "Curso borrado" : "Grupo borrado";

const completionLabel = (score) =>
    score === null || score === undefined ? "Sin final" : `${score}%`;

export const SnapshotDetailPage = () => {
    const { id } = useParams();
    const { snapshot, loading, error } = useSnapshot(id);
    const [actionError, setActionError] = useState("");

    if (loading) {
        return (
            <div className="text-center text-gray-400 py-16">
                Cargando snapshot...
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

    if (!snapshot) {
        return null;
    }

    const payload = snapshot.payload ?? {};
    const stats = snapshot.stats ?? {};
    const students = payload.enrollments ?? [];
    const assignments = payload.assignments ?? [];
    const groups = payload.teams ?? [];
    const grades = payload.grades ?? [];
    const finalGrades = payload.final_grades ?? [];
    const finalByStudent = Object.fromEntries(
        finalGrades
            .filter((entry) => entry.score !== null && entry.score !== undefined)
            .map((entry) => [entry.student_id, entry.score])
    );

    const handleExport = async (kind) => {
        setActionError("");
        try {
            if (kind === "xlsx") {
                await exportSnapshotGrades(snapshot.id);
            } else {
                await exportSnapshotGradesCsv(snapshot.id);
            }
        } catch (err) {
            setActionError("No se pudo generar el archivo. Inténtalo de nuevo.");
        }
    };

    const StatCard = ({ label, value }) => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {label}
            </p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold text-gray-800">
                                {snapshot.course_title}
                            </h1>
                            <span className="text-lg text-gray-400">
                                /
                            </span>
                            <h2 className="text-2xl font-semibold text-gray-600">
                                {snapshot.section_name}
                            </h2>
                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    snapshot.reason === "course_delete"
                                        ? "bg-red-50 text-red-700"
                                        : "bg-amber-50 text-amber-700"
                                }`}
                            >
                                {reasonLabel(snapshot.reason)}
                            </span>
                        </div>
                        <p className="text-gray-500 mt-2 text-sm">
                            Docente: {snapshot.teacher_name} · Borrado el{" "}
                            {formatDate(snapshot.created_at)}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => handleExport("xlsx")}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
                        >
                            Descargar Excel
                        </button>
                        <button
                            type="button"
                            onClick={() => handleExport("csv")}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-indigo-700 border border-indigo-300 hover:bg-indigo-50 transition"
                        >
                            Descargar CSV
                        </button>
                    </div>
                </div>
                {actionError && (
                    <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mt-4">
                        {actionError}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard
                    label="Alumnos aprobados"
                    value={stats.approved_students ?? 0}
                />
                <StatCard
                    label="Solicitudes"
                    value={stats.total_requests ?? 0}
                />
                <StatCard label="Equipos" value={stats.teams ?? 0} />
                <StatCard label="Tareas" value={stats.assignments ?? 0} />
                <StatCard label="Notas" value={stats.grades ?? 0} />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800">
                        Estudiantes
                    </h3>
                </div>
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                            <th className="px-5 py-3">Nombre</th>
                            <th className="px-5 py-3">Usuario</th>
                            <th className="px-5 py-3">Estado</th>
                            <th className="px-5 py-3">Nota final</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {students.length === 0 && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-5 py-8 text-center text-gray-400"
                                >
                                    Sin estudiantes al momento del borrado.
                                </td>
                            </tr>
                        )}
                        {students.map((student) => (
                            <tr key={student.student_id}>
                                <td className="px-5 py-3 text-gray-800">
                                    {student.first_name || student.username}{" "}
                                    {student.last_name}
                                </td>
                                <td className="px-5 py-3 text-gray-600">
                                    @{student.username}
                                </td>
                                <td className="px-5 py-3">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle(student.status)}`}
                                    >
                                        {statusLabel(student.status)}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-gray-800">
                                    {completionLabel(
                                        finalByStudent[student.student_id]
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Equipos ({groups.length})
                </h3>
                {groups.length === 0 && (
                    <p className="text-gray-400 text-sm">
                        No había equipos en este grupo.
                    </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groups.map((group) => (
                        <div
                            key={group.id}
                            className="rounded-lg border border-gray-200 p-4"
                        >
                            <p className="font-semibold text-gray-800">
                                {group.name}
                            </p>
                            <p className="text-sm text-gray-500">
                                Líder: {group.leader?.name ?? "—"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {group.members?.map((member) => (
                                    <span
                                        key={member.id}
                                        className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-xs font-medium"
                                    >
                                        {member.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800">
                        Tareas ({assignments.length})
                    </h3>
                </div>
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                            <th className="px-5 py-3">Título</th>
                            <th className="px-5 py-3">Puntaje máx.</th>
                            <th className="px-5 py-3">Peso</th>
                            <th className="px-5 py-3">Fecha límite</th>
                            <th className="px-5 py-3">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {assignments.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-5 py-8 text-center text-gray-400"
                                >
                                    Sin tareas al momento del borrado.
                                </td>
                            </tr>
                        )}
                        {assignments.map((assignment) => (
                            <tr key={assignment.id}>
                                <td className="px-5 py-3 text-gray-800">
                                    {assignment.title}
                                </td>
                                <td className="px-5 py-3 text-gray-600">
                                    {assignment.max_score}
                                </td>
                                <td className="px-5 py-3 text-gray-600">
                                    {assignment.weight}
                                </td>
                                <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                                    {formatDateOnly(assignment.due_date)}
                                </td>
                                <td className="px-5 py-3">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                            assignment.is_published
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-gray-100 text-gray-600"
                                        }`}
                                    >
                                        {assignment.is_published
                                            ? "Publicada"
                                            : "Borrador"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800">
                        Notas ({grades.length})
                    </h3>
                </div>
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                            <th className="px-5 py-3">Tarea</th>
                            <th className="px-5 py-3">Estudiante</th>
                            <th className="px-5 py-3">Nota</th>
                            <th className="px-5 py-3">Tipo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {grades.length === 0 && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-5 py-8 text-center text-gray-400"
                                >
                                    Aún no había notas registradas.
                                </td>
                            </tr>
                        )}
                        {grades.map((grade) => {
                            const assignment = assignments.find(
                                (item) => item.id === grade.assignment_id
                            );
                            const student = students.find(
                                (item) => item.student_id === grade.student_id
                            );
                            return (
                                <tr key={`${grade.assignment_id}-${grade.student_id}`}>
                                    <td className="px-5 py-3 text-gray-800">
                                        {assignment?.title ?? "Tarea borrada"}
                                    </td>
                                    <td className="px-5 py-3 text-gray-600">
                                        {student?.first_name || student?.username}{" "}
                                        {student?.last_name}
                                    </td>
                                    <td className="px-5 py-3 text-gray-800">
                                        {grade.score}
                                    </td>
                                    <td className="px-5 py-3 text-gray-600">
                                        {grade.is_individual
                                            ? "Individual"
                                            : "Equipo"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};