import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboard } from "@/features/courses/services/courseService";
import { queryKeys } from "@/lib/queryKeys";

export const useDashboard = (userId) => {
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({
        // Incluir la identidad en la clave hace que TanStack trate el dashboard
        // como un recurso distinto al impersonar/terminar la sesión, provocando
        // el refetch automático sin depender del cache en memoria.
        queryKey: [...queryKeys.dashboard.all, userId ?? "anon"],
        queryFn: getDashboard,
    });

    return {
        stats: data,
        loading: isLoading,
        reload: () =>
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    };
};
