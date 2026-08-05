import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/providers/AuthProvider";
import { useCourseDetail } from "@/features/courses/hooks/useCourseDetail";
import { EnrollmentList } from "@/features/courses/components/EnrollmentList";
import { EditCourseModal } from "@/features/courses/components/EditCourseModal";
import { StatusBadge } from "@/features/courses/components/StatusBadge";
import { isTeacher } from "@/shared/untils/roles";

export const CourseDetailPage = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const teacher = isTeacher(user);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const {
        course,
        enrollments,
        loading,
        error,
        approveEnrollment,
        rejectEnrollment,
        updatingEnrollmentId,
        enroll,
        enrolling,
        toggleAutoAccept,
        reload,
    } = useCourseDetail(id);

    const handleEnrollmentStatus = useCallback(
        (enrollmentId, action) =>
            action === "approve"
                ? approveEnrollment(enrollmentId)
                : rejectEnrollment(enrollmentId),
        [approveEnrollment, rejectEnrollment]
    );

    if (loading) {
        return <p className="text-gray-500">Cargando curso...</p>;
    }

    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    if (!course) {
        return <p className="text-gray-500">Curso no encontrado.</p>;
    }

    const autoAccept = Boolean(course.settings?.auto_accept_students);
    const studentEnrollment = teacher ? null : enrollments[0] ?? null;
    const isOwner = teacher && course.teacher?.id === user?.id;

    return (
        <div className="space-y-6 max-w-4xl">
            <Link
                to="/courses"
                className="text-sm text-indigo-600 hover:text-indigo-800"
            >
                &larr; Volver a cursos
            </Link>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            {course.title}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Profesor: {course.teacher?.username}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-medium uppercase tracking-wide px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">
                            {course.visibility === "PUBLIC" ? "Público" : "Privado"}
                        </span>
                        {isOwner && (
                            <button
                                type="button"
                                onClick={() => setIsEditOpen(true)}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                            >
                                Editar
                            </button>
                        )}
                    </div>
                </div>

                {course.description && (
                    <p className="mt-3 text-gray-600">{course.description}</p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span>{course.enrollments_count} alumnos inscritos</span>
                    {teacher && course.join_code && (
                        <span className="font-mono font-semibold tracking-widest text-indigo-600 bg-gray-50 px-2 py-1 rounded">
                            Código: {course.join_code}
                        </span>
                    )}
                </div>
            </div>

            {teacher && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                            Aceptación automática
                        </h2>
                        <p className="text-sm text-gray-500">
                            Aprobar automáticamente las solicitudes de
                            inscripción.
                        </p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={autoAccept}
                        onClick={() => toggleAutoAccept(!autoAccept)}
                        className={`relative w-12 h-7 rounded-full transition ${
                            autoAccept ? "bg-indigo-600" : "bg-gray-300"
                        }`}
                    >
                        <span
                            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition ${
                                autoAccept ? "left-6" : "left-1"
                            }`}
                        />
                    </button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    {teacher
                        ? "Solicitudes de inscripción"
                        : "Mi inscripción"}
                </h2>

                {!teacher && studentEnrollment ? (
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
                ) : !teacher ? (
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
                                {enrolling
                                    ? "Inscribiéndose..."
                                    : "Inscribirme"}
                            </button>
                        )}
                    </div>
                ) : (
                    <EnrollmentList
                        enrollments={enrollments}
                        isTeacher={teacher}
                        onAction={handleEnrollmentStatus}
                        updatingId={updatingEnrollmentId}
                    />
                )}
            </div>

            <EditCourseModal
                course={course}
                open={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSaved={async () => {
                    await reload();
                    setIsEditOpen(false);
                }}
            />
        </div>
    );
};
