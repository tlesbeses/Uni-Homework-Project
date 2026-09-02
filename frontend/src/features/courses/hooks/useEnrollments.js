import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
    approveEnrollment as approveEnrollmentRequest,
    getEnrollments,
    rejectEnrollment as rejectEnrollmentRequest,
} from "@/features/courses/services/courseService";
import { queryKeys, invalidateScope } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useEnrollments = (courseId) => {
    const queryClient = useQueryClient();
    const [updatingEnrollmentId, setUpdatingEnrollmentId] = useState(null);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.courses.enrollments(courseId),
        queryFn: async () => {
            const res = await getEnrollments(courseId, { page_size: 100 });
            return Array.isArray(res.results)
                ? res.results
                : Array.isArray(res)
                  ? res
                  : [];
        },
        enabled: Boolean(courseId),
    });

    const mutation = useMutation({
        mutationFn: ({ enrollmentId, action }) =>
            action === "approve"
                ? approveEnrollmentRequest(enrollmentId)
                : rejectEnrollmentRequest(enrollmentId),
        onMutate: ({ enrollmentId }) => {
            setUpdatingEnrollmentId(enrollmentId);
        },
        onSuccess: (_data, { action }) => {
            toast.success(
                action === "approve"
                    ? "Inscripción aprobada"
                    : "Inscripción rechazada"
            );
            invalidateScope(queryClient, "enrollments");
        },
        onError: (err) => {
            toast.error(getErrorMessage(err));
        },
        onSettled: () => {
            setUpdatingEnrollmentId(null);
        },
    });

    const approveEnrollment = (enrollmentId) =>
        mutation.mutateAsync({ enrollmentId, action: "approve" });

    const rejectEnrollment = (enrollmentId) =>
        mutation.mutateAsync({ enrollmentId, action: "reject" });

    return {
        enrollments: data ?? [],
        loading: isLoading,
        error: error ? getErrorMessage(error) : "",
        reload: () => refetch(),
        approveEnrollment,
        rejectEnrollment,
        updatingEnrollmentId,
    };
};
