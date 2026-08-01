import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
    approveEnrollment,
    getCourse,
    getEnrollments,
    rejectEnrollment,
    updateCourseSettings,
} from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/untils/getErrorMessage";

export const useCourseDetail = (courseId) => {
    const [course, setCourse] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingEnrollmentId, setUpdatingEnrollmentId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [courseData, enrollmentsData] = await Promise.all([
                getCourse(courseId),
                getEnrollments(),
            ]);
            const items = enrollmentsData.results ?? enrollmentsData;
            setCourse(courseData);
            setEnrollments(
                items.filter(
                    (enrollment) => enrollment.course.id === Number(courseId)
                )
            );
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        load();
    }, [load]);

    const handleEnrollmentStatus = useCallback(
        async (enrollmentId, action) => {
            setUpdatingEnrollmentId(enrollmentId);
            try {
                if (action === "approve") {
                    await approveEnrollment(enrollmentId);
                    toast.success("Inscripción aprobada");
                } else {
                    await rejectEnrollment(enrollmentId);
                    toast.success("Inscripción rechazada");
                }
                await load();
            } catch (err) {
                toast.error(getErrorMessage(err));
            } finally {
                setUpdatingEnrollmentId(null);
            }
        },
        [load]
    );

    const toggleAutoAccept = useCallback(
        async (checked) => {
            if (!course) {
                return;
            }
            try {
                const updated = await updateCourseSettings(course.id, {
                    auto_accept_students: checked,
                });
                setCourse((prev) =>
                    prev
                        ? { ...prev, settings: { ...prev.settings, ...updated } }
                        : prev
                );
                toast.success("Ajustes del curso actualizados");
            } catch (err) {
                toast.error(getErrorMessage(err));
            }
        },
        [course]
    );

    return {
        course,
        enrollments,
        loading,
        error,
        reload: load,
        handleEnrollmentStatus,
        updatingEnrollmentId,
        toggleAutoAccept,
    };
};
