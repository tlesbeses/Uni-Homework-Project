import { useCallback } from "react";
import { EnrollmentList } from "@/features/courses/components/EnrollmentList";
import { StatusBadge } from "@/features/courses/components/StatusBadge";
import { useCourseEnrollment } from "@/features/courses/hooks/useCourseEnrollment";
import { useCourseEnrollments } from "@/features/courses/hooks/useCourseEnrollments";

export const EnrollmentSection = ({
    courseId,
    teacher,
    course,
    reloadCourse,
}) => {
    const {
        enrollments,
        loading,
        error,
        reload: reloadEnrollments,
        approveEnrollment,
        rejectEnrollment,
        updatingEnrollmentId,
    } = useCourseEnrollments(courseId);

    const { enroll: submitEnrollment, enrolling } = useCourseEnrollment(courseId);

    const enroll = useCallback(async () => {
        const submitted = await submitEnrollment();
        if (submitted) {
            await Promise.all([reloadCourse(), reloadEnrollments()]);
        }
    }, [submitEnrollment, reloadCourse, reloadEnrollments]);

    const handleEnrollmentStatus = useCallback(
        (enrollmentId, action) =>
            action === "approve"
                ? approveEnrollment(enrollmentId)
                : rejectEnrollment(enrollmentId),
        [approveEnrollment, rejectEnrollment]
    );

    const studentEnrollment = teacher ? null : enrollments[0] ?? null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
                {teacher ? "Solicitudes de inscripción" : "Mi inscripción"}
            </h2>

            {loading ? (
                <p className="text-sm text-gray-500">Cargando inscripciones...</p>
            ) : error ? (
                <p className="text-sm text-red-500">{error}</p>
            ) : teacher ? (
                <EnrollmentList
                    enrollments={enrollments}
                    isTeacher={teacher}
                    onAction={handleEnrollmentStatus}
                    updatingId={updatingEnrollmentId}
                />
            ) : studentEnrollment ? (
                <div className="flex items-center gap-3">
                    <StatusBadge status={studentEnrollment.status} />
                    {studentEnrollment.approved_at && (
                        <span className="text-sm text-gray-500">
                            Aprobada el{" "}
                            {new Date(
                                studentEnrollment.approved_at
                            ).toLocaleDateString()}
                        </span>
                    )}
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-gray-500">
                        No estás inscrito en este curso.
                    </p>
                    {course.visibility === "PUBLIC" && (
                        <button
                            type="button"
                            onClick={enroll}
                            disabled={enrolling}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow transition"
                        >
                            {enrolling ? "Inscribiéndose..." : "Inscribirme"}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
