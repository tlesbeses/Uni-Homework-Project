import { useState } from "react";
import { PublishBadge } from "@/features/assignments/components/PublishBadge";
import { formatDateTime } from "@/features/assignments/utils/formatDate";
import { Button } from "@/shared/components/ui/Button";

export const AssignmentList = ({
    assignments,
    canManage,
    onEdit,
    onDelete,
    onTogglePublish,
    onGrade,
    onOpen,
    deletingId,
    togglingId,
}) => {
    const [pressedId, setPressedId] = useState(null);
    const isPressed = (id) => pressedId === id;

    const clearPressed = () => setPressedId(null);

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
                        onClick={onOpen ? () => onOpen(assignment) : undefined}
                        onPointerDown={() => setPressedId(assignment.id)}
                        onPointerUp={clearPressed}
                        onPointerLeave={clearPressed}
                        onPointerCancel={clearPressed}
                        onKeyDown={
                            onOpen
                                ? (e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          onOpen(assignment);
                                      }
                                  }
                                : undefined
                        }
                        role={onOpen ? "button" : undefined}
                        tabIndex={onOpen ? 0 : undefined}
                        className={`py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none ${
                            onOpen ? "cursor-pointer" : ""
                        }`}
                    >
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-medium text-gray-800">
                                    {assignment.title}
                                </p>
                                <span className="text-xs text-gray-500 shrink-0 pt-0.5">
                                    Puntaje máximo: {assignment.max_score}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <PublishBadge published={assignment.is_published} />
                                {assignment.category === "EXAMEN" && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                                        Examen
                                    </span>
                                )}
                                {assignment.category === "ACUMULADO" && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700">
                                        Acumulado
                                    </span>
                                )}
                                {assignment.parcial && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                                        {assignment.parcial === "SEGUNDO"
                                            ? "Parcial 2"
                                            : "Parcial 1"}
                                    </span>
                                )}
                            </div>
                            {assignment.description &&
                                isPressed(assignment.id) && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        {assignment.description}
                                    </p>
                                )}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                                <span>Entrega: {formatDateTime(assignment.due_date)}</span>
                            </div>
                        </div>

                        {canManage && (
                            <div className="flex flex-wrap justify-end items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                {onGrade && (
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={() => onGrade(assignment)}
                                        disabled={busy}
                                    >
                                        Evaluar
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="soft"
                                    onClick={() => onTogglePublish(assignment)}
                                    disabled={busy}
                                >
                                    {assignment.is_published ? "Ocultar" : "Publicar"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="neutral"
                                    onClick={() => onEdit(assignment)}
                                    disabled={busy}
                                >
                                    Editar
                                </Button>
                                <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => onDelete(assignment)}
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
    );
};
