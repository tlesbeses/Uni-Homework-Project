import { useState } from "react";
import { Link } from "react-router-dom";
import { PublishBadge } from "@/features/assignments/components/PublishBadge";
import { CreateAssignmentModal } from "@/features/assignments/components/CreateAssignmentModal";
import { EditAssignmentModal } from "@/features/assignments/components/EditAssignmentModal";
import { useAllAssignments } from "@/features/assignments/hooks/useAllAssignments";
import {
    useDeleteAssignment,
    useToggleAssignmentPublish,
} from "@/features/assignments/hooks/useAssignmentMutations";
import { formatDateTime } from "@/features/assignments/utils/formatDate";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { useCourses } from "@/features/courses/hooks/useCourses";
import { ConfirmModal } from "@/shared/components/ConfirmModal";
import { Button } from "@/shared/components/ui/Button";
import { SelectField } from "@/shared/components/ui/SelectField";

export const AssignmentsPage = () => {
    const { isTeacher } = useAuth();
    const { assignments, loading, error, reload } = useAllAssignments();
    const { courses } = useCourses();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [courseFilter, setCourseFilter] = useState("");
    const [pendingDelete, setPendingDelete] = useState(null);

    const deleteMutation = useDeleteAssignment();
    const togglePublishMutation = useToggleAssignmentPublish();

    const filteredAssignments = courseFilter
        ? assignments.filter(
              (assignment) =>
                  String(assignment.course.id) === String(courseFilter)
          )
        : assignments;

    const confirmDelete = async () => {
        const assignment = pendingDelete;
        setPendingDelete(null);
        setDeletingId(assignment.id);
        try {
            await deleteMutation.mutateAsync(assignment.id);
        } finally {
            setDeletingId(null);
        }
    };

    const handleTogglePublish = async (assignment) => {
        setTogglingId(assignment.id);
        try {
            await togglePublishMutation.mutateAsync({
                assignmentId: assignment.id,
                isPublished: !assignment.is_published,
            });
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Asignaciones
                    </h1>
                    <p className="text-sm text-gray-500">
                        Todas tus asignaciones en los cursos.
                    </p>
                </div>

                {isTeacher && (
                    <Button onClick={() => setIsCreateOpen(true)}>
                        + Nueva asignación
                    </Button>
                )}
            </div>

            {(courses ?? []).length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                    <SelectField
                        compact
                        label="Curso"
                        name="course_filter"
                        value={courseFilter}
                        onChange={(e) => setCourseFilter(e.target.value)}
                    >
                        <option value="">Todos los cursos</option>
                        {(courses ?? []).map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.title}
                            </option>
                        ))}
                    </SelectField>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                {loading && (
                    <p className="text-sm text-gray-500">
                        Cargando asignaciones...
                    </p>
                )}
                {error && <p className="text-sm text-red-500">{error}</p>}

                {!loading && !error && filteredAssignments.length === 0 && (
                    <p className="text-sm text-gray-500">
                        No hay asignaciones disponibles.
                    </p>
                )}

                {!loading && !error && filteredAssignments.length > 0 && (
                    <ul className="divide-y divide-gray-100">
                        {(filteredAssignments ?? []).map((assignment) => {
                            const busy =
                                deletingId === assignment.id ||
                                togglingId === assignment.id;

                            return (
                                <li
                                    key={assignment.id}
                                    className="py-4 flex items-start justify-between gap-3"
                                >
                                    <div className="min-w-0">
                                        <Link
                                            to={`/courses/${assignment.course.id}`}
                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                        >
                                            {assignment.course.title}
                                        </Link>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <p className="text-sm font-medium text-gray-800">
                                                {assignment.title}
                                            </p>
                                            <PublishBadge
                                                published={
                                                    assignment.is_published
                                                }
                                            />
                                        </div>
                                        {assignment.description && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                {assignment.description}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                                            <span>
                                                Puntaje máximo:{" "}
                                                {assignment.max_score}
                                            </span>
                                            <span>
                                                Entrega:{" "}
                                                {formatDateTime(
                                                    assignment.due_date
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {isTeacher && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                variant="soft"
                                                onClick={() =>
                                                    handleTogglePublish(
                                                        assignment
                                                    )
                                                }
                                                disabled={busy}
                                            >
                                                {assignment.is_published
                                                    ? "Ocultar"
                                                    : "Publicar"}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="neutral"
                                                onClick={() =>
                                                    setEditingAssignment(
                                                        assignment
                                                    )
                                                }
                                                disabled={busy}
                                            >
                                                Editar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() =>
                                                    setPendingDelete(assignment)
                                                }
                                                disabled={busy}
                                            >
                                                Eliminar
                                            </Button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <CreateAssignmentModal
                courses={isTeacher ? courses : undefined}
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onCreated={() => {
                    setIsCreateOpen(false);
                    reload();
                }}
            />

            <EditAssignmentModal
                assignment={editingAssignment}
                open={Boolean(editingAssignment)}
                onClose={() => setEditingAssignment(null)}
                onSaved={() => {
                    setEditingAssignment(null);
                    reload();
                }}
            />

            <ConfirmModal
                open={Boolean(pendingDelete)}
                title="Eliminar asignación"
                description={
                    pendingDelete
                        ? `¿Eliminar "${pendingDelete.title}"? Esta acción no se puede deshacer.`
                        : ""
                }
                confirmLabel="Eliminar"
                onCancel={() => setPendingDelete(null)}
                onConfirm={confirmDelete}
                busy={Boolean(deletingId)}
            />
        </div>
    );
};
