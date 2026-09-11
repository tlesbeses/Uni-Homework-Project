import { useQuery } from "@tanstack/react-query";
import { getErrorLog } from "@/features/admin/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useErrorDetail = (errorId) => {
    const query = useQuery({
        queryKey: queryKeys.admin.errorLog(errorId),
        queryFn: () => getErrorLog(errorId),
        enabled: Boolean(errorId),
        staleTime: 30_000,
    });

    return {
        errorLog: query.data,
        loading: query.isLoading,
        error: query.error ? getErrorMessage(query.error) : "",
        reload: () => query.refetch(),
    };
};