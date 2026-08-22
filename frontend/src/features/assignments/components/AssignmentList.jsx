import { PublishBadge } from "@/features/assignments/components/PublishBadge";
import { formatDateTime } from "@/features/assignments/utils/formatDate";

export const AssignmentList = ({
    assignments,
    canManage,
    onEdit,
    onDelete,
    onTogglePublish,
    onGrade,
    deletingId,
    togglingId,
}) => {
    if ((assignments ?? []).length === 0) {
        return (
            <p className="text-sm text-gray-500">
                Aún no hay asignaciones para este curso.
            </p>
        );
    }

    return (
        <ul className="divide-y divide-gray-100">
            {(assignments ?? []).map((assignment) => {
                const busy =
                    deletingId === assignment.id ||
                    togglingId === assignment.id;

                return (
                    <li
                        key={assignment.id}
                        className="py-4 flex items-center justify-between gap-3"
                    >
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-gray-800">
                                    {assignment.title}
                                </p>
                                <PublishBadge published={assignment.is_published} />
                            </div>
                            {assignment.description && (
                                <p className="text-sm text-gray-500 mt-1">
                                    {assignment.description}
                                </p>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                                <span>
                                    Puntaje máximo: {assignment.max_score}
                                </span>
                                <span>Entrega: {formatDateTime(assignment.due_date)}</span>
                            </div>
                        </div>

                        {canManage && (
                            <div className="flex items-center gap-2 shrink-0">
                                {onGrade && (
                                    <button
                                        type="button"
                                        onClick={() => onGrade(assignment)}
                                        disabled={busy}
                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                                    >
                                        Calificar
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onTogglePublish(assignment)}
                                    disabled={busy}
                                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition disabled:opacity-50"
                                >
                                    {assignment.is_published ? "Ocultar" : "Publicar"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onEdit(assignment)}
                                    disabled={busy}
                                    className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                                >
                                    Editar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDelete(assignment)}
                                    disabled={busy}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                                >
                                    Eliminar
                                </button>
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
};
