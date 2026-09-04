import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { deleteCourse, updateCourse } from "@/features/courses/services/courseService";
import { invalidateScope } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useDeleteCourse = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteCourse,
        onSuccess: () => {
            toast.success("Curso eliminado");
            invalidateScope(queryClient, "courses");
        },
        onError: (err) => {
            toast.error(getErrorMessage(err));
        },
    });
};

export const useToggleCourseActive = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ courseId, isActive }) =>
            updateCourse(courseId, { is_active: isActive }),
        onSuccess: (_, variables) => {
            toast.success(variables.isActive ? "Curso restaurado" : "Curso archivado");
            invalidateScope(queryClient, "courses");
        },
        onError: (err) => {
            toast.error(getErrorMessage(err));
        },
    });
};
