import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { enrollInCourse } from "@/features/courses/services/courseService";
import { invalidateScope } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useEnrollment = (courseId) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (sectionId) => enrollInCourse(courseId, sectionId),
        onSuccess: () => {
            toast.success("Solicitud de inscripción enviada");
            invalidateScope(queryClient, "enrollments");
        },
        onError: (err) => {
            toast.error(getErrorMessage(err));
        },
    });

    const enroll = async (sectionId) => {
        try {
            await mutation.mutateAsync(sectionId);
            return true;
        } catch {
            return false;
        }
    };

    return { enroll, enrolling: mutation.isPending };
};
