import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAssignments } from "@/features/assignments/services/assignmentService";
import { queryKeys } from "@/lib/queryKeys";
import { fetchAllPages } from "@/shared/utils/fetchAllPages";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useAllAssignments = () => {
    const queryClient = useQueryClient();
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.assignments.list({ all: true }),
        queryFn: () => fetchAllPages(getAssignments),
    });

    return {
        assignments: data ?? [],
        loading: isLoading,
        error: error ? getErrorMessage(error) : "",
        reload: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.assignments.all,
            });
            return refetch();
        },
    };
};
