import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
    deleteAssignment,
    updateAssignment,
} from "@/features/assignments/services/assignmentService";
import { invalidateScope } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useDeleteAssignment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteAssignment,
        onSuccess: () => {
            toast.success("Asignación eliminada");
            invalidateScope(queryClient, "assignments");
        },
        onError: (err) => {
            toast.error(getErrorMessage(err));
        },
    });
};

export const useToggleAssignmentPublish = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ assignmentId, isPublished }) =>
            updateAssignment(assignmentId, { is_published: isPublished }),
        onSuccess: (_data, { isPublished }) => {
            toast.success(isPublished ? "Asignación publicada" : "Asignación oculta");
            invalidateScope(queryClient, "assignments");
        },
        onError: (err) => {
            toast.error(getErrorMessage(err));
        },
    });
};
