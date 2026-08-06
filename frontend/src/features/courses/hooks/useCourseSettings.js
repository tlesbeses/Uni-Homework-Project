import { useCallback } from "react";
import { toast } from "react-toastify";
import { updateCourseSettings } from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useCourseSettings = ({ course, updateCourse } = {}) => {
    const toggleAutoAccept = useCallback(
        async (checked) => {
            if (!course) {
                return;
            }
            try {
                const updated = await updateCourseSettings(course.id, {
                    auto_accept_students: checked,
                });
                updateCourse((prev) =>
                    prev
                        ? { ...prev, settings: { ...prev.settings, ...updated } }
                        : prev
                );
                toast.success("Ajustes del curso actualizados");
            } catch (err) {
                toast.error(getErrorMessage(err));
            }
        },
        [course, updateCourse]
    );

    return { toggleAutoAccept };
};
