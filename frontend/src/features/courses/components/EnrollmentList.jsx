import { StatusBadge } from "@/features/courses/components/StatusBadge";
import { Button } from "@/shared/components/ui/Button";

export const EnrollmentList = ({
    enrollments,
    isTeacher,
    onAction,
    updatingId,
}) => {
    if ((enrollments ?? []).length === 0) {
        return <p className="text-sm text-gray-500">Aún no hay inscripciones.</p>;
    }

    return (
        <ul className="divide-y divide-gray-100">
            {(enrollments ?? []).map((enrollment) => {
                const studentName = enrollment.student?.username ?? "Desconocido";
                const pending = enrollment.status === "PENDING";
                const busy = updatingId === enrollment.id;

                return (
                    <li
                        key={enrollment.id}
                        className="py-3 flex items-center justify-between gap-3"
                    >
                        <div>
                            <p className="text-sm font-medium text-gray-800">
                                {studentName}
                            </p>
                            {enrollment.section?.name && (
                                <p className="text-xs text-gray-500">
                                    Sección: {enrollment.section.name}
                                </p>
                            )}
                            <div className="mt-1">
                                <StatusBadge status={enrollment.status} />
                            </div>
                        </div>

                        {isTeacher && pending && (
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() =>
                                        onAction(enrollment.id, "approve")
                                    }
                                    disabled={busy}
                                >
                                    Aprobar
                                </Button>
                                <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() =>
                                        onAction(enrollment.id, "reject")
                                    }
                                    disabled={busy}
                                >
                                    Rechazar
                                </Button>
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
};
