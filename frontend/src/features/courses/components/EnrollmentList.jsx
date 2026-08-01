import { StatusBadge } from "@/features/courses/components/StatusBadge";

export const EnrollmentList = ({
    enrollments,
    isTeacher,
    onAction,
    updatingId,
}) => {
    if (enrollments.length === 0) {
        return <p className="text-sm text-gray-500">Aún no hay inscripciones.</p>;
    }

    return (
        <ul className="divide-y divide-gray-100">
            {enrollments.map((enrollment) => {
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
                            <div className="mt-1">
                                <StatusBadge status={enrollment.status} />
                            </div>
                        </div>

                        {isTeacher && pending && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        onAction(enrollment.id, "approve")
                                    }
                                    disabled={busy}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50"
                                >
                                    Aprobar
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        onAction(enrollment.id, "reject")
                                    }
                                    disabled={busy}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                                >
                                    Rechazar
                                </button>
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
};
