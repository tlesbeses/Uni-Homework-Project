import { useCallback, useEffect, useState } from "react";
import { EnrollmentList } from "@/features/courses/components/EnrollmentList";
import { StatusBadge } from "@/features/courses/components/StatusBadge";
import { useEnrollment } from "@/features/courses/hooks/useEnrollment";
import { useEnrollments } from "@/features/courses/hooks/useEnrollments";
import { getSections } from "@/features/courses/services/courseService";

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
    } = useEnrollments(courseId);

    const { enroll: submitEnrollment, enrolling } = useEnrollment(courseId);
    const [sections, setSections] = useState([]);
    const [selectedSectionId, setSelectedSectionId] = useState("");

    useEffect(() => {
        if (teacher || course?.visibility !== "PUBLIC") {
            return;
        }
        let active = true;
        getSections(courseId, { page_size: 100 })
            .then((data) => {
                if (!active) {
                    return;
                }
                setSections(
                    Array.isArray(data.results)
                        ? data.results
                        : Array.isArray(data)
                          ? data
                          : []
                );
            })
            .catch(() => {
                // Sin secciones el botón de inscripción simplemente no se muestra.
            });
        return () => {
            active = false;
        };
    }, [courseId, teacher, course?.visibility]);

    const enroll = useCallback(async () => {
        if (!selectedSectionId) {
            return;
        }
        const submitted = await submitEnrollment(selectedSectionId);
        if (submitted) {
            await Promise.all([reloadCourse(), reloadEnrollments()]);
        }
    }, [submitEnrollment, selectedSectionId, reloadCourse, reloadEnrollments]);

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
                    {studentEnrollment.section?.name && (
                        <span className="text-xs font-medium uppercase tracking-wide px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">
                            Sección: {studentEnrollment.section.name}
                        </span>
                    )}
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
                <div className="flex flex-wrap items-end gap-3">
                    <p className="text-sm text-gray-500">
                        No estás inscrito en este curso.
                    </p>
                    {course.visibility === "PUBLIC" &&
                        sections.length > 0 && (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                        Sección
                                    </label>
                                    <select
                                        value={selectedSectionId}
                                        onChange={(event) =>
                                            setSelectedSectionId(
                                                event.target.value
                                            )
                                        }
                                        className="px-4 py-2.5 rounded-lg border outline-none transition text-gray-700 text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">
                                            Selecciona una sección...
                                        </option>
                                        {sections.map((section) => (
                                            <option
                                                key={section.id}
                                                value={section.id}
                                            >
                                                {section.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={enroll}
                                    disabled={
                                        enrolling || !selectedSectionId
                                    }
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow transition"
                                >
                                    {enrolling
                                        ? "Inscribiéndose..."
                                        : "Inscribirme"}
                                </button>
                            </>
                        )}
                </div>
            )}
        </div>
    );
};
