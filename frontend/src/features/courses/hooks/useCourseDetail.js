import { useCallback } from "react";
import { useCourse } from "@/features/courses/hooks/useCourse";
import { useCourseEnrollment } from "@/features/courses/hooks/useCourseEnrollment";
import { useCourseEnrollments } from "@/features/courses/hooks/useCourseEnrollments";
import { useCourseSettings } from "@/features/courses/hooks/useCourseSettings";

export const useCourseDetail = (courseId) => {
    const {
        course,
        loading: courseLoading,
        error: courseError,
        reload: reloadCourse,
        updateCourse,
    } = useCourse(courseId);

    const {
        enrollments,
        loading: enrollmentsLoading,
        error: enrollmentsError,
        reload: reloadEnrollments,
        approveEnrollment,
        rejectEnrollment,
        updatingEnrollmentId,
    } = useCourseEnrollments(courseId);

    const { toggleAutoAccept } = useCourseSettings(courseId, {
        course,
        updateCourse,
    });

    const reload = useCallback(async () => {
        await Promise.all([reloadCourse(), reloadEnrollments()]);
    }, [reloadCourse, reloadEnrollments]);

    const { enroll, enrolling } = useCourseEnrollment(courseId, {
        onSuccess: reload,
    });

    return {
        course,
        enrollments,
        loading: courseLoading || enrollmentsLoading,
        error: courseError || enrollmentsError,
        reload,
        approveEnrollment,
        rejectEnrollment,
        updatingEnrollmentId,
        enroll,
        enrolling,
        toggleAutoAccept,
    };
};
