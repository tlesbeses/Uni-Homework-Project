import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/shared/components/ui/Modal";
import { getGradeHistory } from "@/features/grades/services/gradeService";
import { queryKeys } from "@/lib/queryKeys";
import { studentName } from "@/features/grades/components/grading/gradingUtils";

export const GradeHistoryModal = ({
    student,
    grade,
    assignment,
    maxScore,
    onClose,
}) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: queryKeys.grades.history(grade?.id ?? ""),
        queryFn: () => getGradeHistory(grade.id),
        enabled: Boolean(grade),
        staleTime: 30_000,
    });

    const history = useMemo(() => {
        if (!data) {
            return null;
        }
        return Array.isArray(data) ? data : data.results ?? [];
    }, [data]);

    return (
        <Modal open onClose={onClose} className="max-h-[80vh] overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-100">
                <div>
                    <h3 className="text-base font-bold text-gray-800">
                        Historial de {studentName(student)}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {assignment?.title} — {maxScore} puntos
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar"
                    className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                    ×
                </button>
            </div>
            <div className="max-h-[60vh] overflow-auto px-6 py-4">
                {isLoading ? (
                    <p className="text-sm text-gray-500">
                        Cargando historial...
                    </p>
                ) : isError ? (
                    <p className="text-sm text-red-600">
                        No se pudo cargar el historial.
                    </p>
                ) : history?.length === 0 ? (
                    <p className="text-sm text-gray-500">Sin registros.</p>
                ) : (
                    <ol className="space-y-3">
                        {(history ?? []).map((entry) => {
                            const isCreation = entry.first_record;
                            return (
                                <li
                                    key={entry.id}
                                    className="flex items-start justify-between gap-3 text-sm"
                                >
                                    <div>
                                        <p className="text-gray-800 font-semibold">
                                            {isCreation
                                                ? "Nota registrada"
                                                : "Nota actualizada"}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            <span className="font-medium text-gray-600">
                                                {entry.graded_by
                                                    ? `${entry.graded_by.first_name || entry.graded_by.username} ${
                                                          entry.graded_by.last_name ?? ""
                                                      }`.trim()
                                                    : "—"}
                                            </span>{" "}
                                            •{" "}
                                            {new Date(
                                                entry.created_at
                                            ).toLocaleString("es-ES", {
                                                dateStyle: "short",
                                                timeStyle: "short",
                                            })}
                                        </p>
                                    </div>
                                    <p className="font-bold text-gray-800 shrink-0">
                                        {isCreation
                                            ? ""
                                            : `${entry.old_score} → `}
                                        {entry.new_score}
                                    </p>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
        </Modal>
    );
};