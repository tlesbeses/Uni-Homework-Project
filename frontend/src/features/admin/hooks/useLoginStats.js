import { useQuery } from "@tanstack/react-query";
import { getLoginStats } from "@/features/admin/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

// Métricas de acceso (logins y usuarios únicos por día) para la consola de
// administración.
export const useLoginStats = (days = 7) => {
    const query = useQuery({
        queryKey: queryKeys.admin.loginStats(days),
        queryFn: () => getLoginStats({ days }),
        staleTime: 30_000,
    });

    return {
        stats: query.data,
        loading: query.isLoading,
        error: query.error ? getErrorMessage(query.error) : "",
        reload: () => query.refetch(),
    };
};