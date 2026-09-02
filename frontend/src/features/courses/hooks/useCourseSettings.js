import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import {
    updateCourse as updateCourseRequest,
    updateCourseSettings,
} from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useCourseSettings = ({ course, updateCourse } = {}) => {
    const [savingField, setSavingField] = useState(null);
    const [pendingActive, setPendingActive] = useState(false);

    const toggleAutoAccept = useCallback(
        async (checked) => {
            if (!course) {
                return;
            }
            setSavingField("auto_accept");
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
            } finally {
                setSavingField(null);
            }
        },
        [course, updateCourse]
    );

    const patchCourseField = useCallback(
        async (field, payload, successMessage) => {
            if (!course) {
                return;
            }
            setSavingField(field);
            try {
                const updated = await updateCourseRequest(course.id, payload);
                updateCourse((prev) =>
                    prev ? { ...prev, ...updated } : prev
                );
                toast.success(successMessage);
            } catch (err) {
                toast.error(getErrorMessage(err));
            } finally {
                setSavingField(null);
            }
        },
        [course, updateCourse]
    );

    const toggleVisibility = useCallback(
        (isPublic) =>
            patchCourseField(
                "visibility",
                { visibility: isPublic ? "PUBLIC" : "PRIVATE" },
                isPublic
                    ? "El curso ahora es público"
                    : "El curso ahora es privado"
            ),
        [patchCourseField]
    );

    const confirmToggleActive = useCallback(
        async () => {
            if (!course) {
                return;
            }
            const nextActive = !course.is_active;
            setPendingActive(false);
            await patchCourseField(
                "is_active",
                { is_active: nextActive },
                nextActive ? "Curso activado" : "Curso desactivado"
            );
        },
        [course, patchCourseField]
    );

    return {
        savingField,
        toggleAutoAccept,
        toggleVisibility,
        pendingActive,
        setPendingActive,
        confirmToggleActive,
    };
};
