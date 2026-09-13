import { useState } from "react";
import { useParams } from "react-router-dom";
import {
    exportSnapshotGrades,
    exportSnapshotGradesCsv,
} from "@/features/snapshots/services/snapshotService";
import { useSnapshot } from "@/features/snapshots/hooks/useSnapshot";
import { Button } from "@/shared/components/ui/Button";
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

    const studentColumns = [
        {
            key: "name",
            header: "Nombre",
            role: "primary",
            render: (student) => (
                <span className="font-medium text-gray-800">
                    {student.first_name || student.username}{" "}
                    {student.last_name}
                </span>
            ),
        },
        {
            key: "username",
            header: "Usuario",
            role: "secondary",
            render: (student) => (
                <span className="text-gray-600">
                    @{student.username}
                </span>
            ),
        },
        {
            key: "status",
            header: "Estado",
            role: "secondary",
            render: (student) => (
                <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle(student.status)}`}
                >
                    {statusLabel(student.status)}
                </span>
            ),
        },
        {
            key: "finalGrade",
            header: "Nota final",
            role: "secondary",
            render: (student) => (
                <span className="font-medium text-gray-800">
                    {completionLabel(finalByStudent[student.student_id])}
                </span>
            ),
        },
    ];

    const assignmentColumns = [
        {
            key: "title",
            header: "Título",
            role: "primary",
            render: (assignment) => (
                <span className="font-medium text-gray-800">
                    {assignment.title}
                </span>
            ),
        },
        {
            key: "dueDate",
            header: "Fecha límite",
            role: "secondary",
            render: (assignment) => (
                <span className="whitespace-nowrap text-gray-600">
                    {formatDateOnly(assignment.due_date)}
                </span>
            ),
        },
        {
            key: "status",
            header: "Estado",
            role: "secondary",
            render: (assignment) => (
                <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        assignment.is_published
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                    }`}
                >
                    {assignment.is_published ? "Publicada" : "Borrador"}
                </span>
            ),
        },
        {
            key: "max_score",
            header: "Puntaje máx.",
            role: "optional",
            render: (assignment) => (
                <span className="text-gray-600">
                    {assignment.max_score}
                </span>
            ),
        },
    ];

    const gradeColumns = [
        {
            key: "assignment",
            header: "Tarea",
            role: "primary",
            render: (grade) => {
                const assignment = assignments.find(
                    (item) => item.id === grade.assignment_id,
                );
                return (
                    <span className="font-medium text-gray-800">
                        {assignment?.title ?? "Tarea borrada"}
                    </span>
                );
            },
        },
        {
            key: "student",
            header: "Estudiante",
            role: "secondary",
            render: (grade) => {
                const student = students.find(
                    (item) => item.student_id === grade.student_id,
                );
                return (
                    <span className="text-gray-600">
                        {student?.first_name || student?.username}{" "}
                        {student?.last_name}
                    </span>
                );
            },
        },
        {
            key: "score",
            header: "Nota",
            role: "primary",
            render: (grade) => (
                <span className="font-bold text-gray-800">
                    {grade.score}
                </span>
            ),
        },
        {
            key: "type",
            header: "Tipo",
            role: "optional",
            render: (grade) => (
                <span className="text-gray-600">
                    {grade.is_individual ? "Individual" : "Equipo"}
                </span>
            ),
        },
    ];

    const handleExport = async (kind) => {
        setActionError("");
        try {
            if (kind === "xlsx") {
                await exportSnapshotGrades(snapshot.id);
            } else {
                await exportSnapshotGradesCsv(snapshot.id);
            }
        } catch {
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
                        <Button onClick={() => handleExport("xlsx")}>
                            Descargar Excel
                        </Button>
                        <Button onClick={() => handleExport("csv")} variant="outline">
                            Descargar CSV
                        </Button>
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

            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Estudiantes
                </h3>
                <ResponsiveDataTable
                    columns={studentColumns}
                    rows={students}
                    rowKey={(student) => student.student_id}
                    emptyContent="Sin estudiantes al momento del borrado."
                    ariaLabel="Estudiantes"
                />
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

            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Tareas ({assignments.length})
                </h3>
                <ResponsiveDataTable
                    columns={assignmentColumns}
                    rows={assignments}
                    rowKey={(assignment) => assignment.id}
                    emptyContent="Sin tareas al momento del borrado."
                    ariaLabel="Tareas"
                />
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Notas ({grades.length})
                </h3>
                <ResponsiveDataTable
                    columns={gradeColumns}
                    rows={grades}
                    rowKey={(grade) =>
                        `${grade.assignment_id}-${grade.student_id}`
                    }
                    emptyContent="Aún no había notas registradas."
                    ariaLabel="Notas"
                />
            </div>
        </div>
    );
};