import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboard } from "@/features/courses/services/courseService";
import { queryKeys } from "@/lib/queryKeys";

export const useDashboard = () => {
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: queryKeys.dashboard.all,
        queryFn: getDashboard,
    });

    return {
        stats: data,
        loading: isLoading,
        reload: () =>
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    };
};
