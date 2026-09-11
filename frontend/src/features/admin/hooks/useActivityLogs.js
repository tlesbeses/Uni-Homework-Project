import { useState } from "react";
import {
    keepPreviousData,
    useQuery,
} from "@tanstack/react-query";
import { getActivityLogs } from "@/features/admin/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useActivityLogs = ({
    action = "",
    entityType = "",
    userId = "",
    from = "",
    to = "",
} = {}) => {
    const [page, setPage] = useState(1);
    const params = {
        action: action || undefined,
        entityType: entityType || undefined,
        userId: userId || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
    };
    const query = useQuery({
        queryKey: queryKeys.admin.activityLogs(params),
        queryFn: () => getActivityLogs(params),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });

    return {
        logs: query.data?.results ?? [],
        count: query.data?.count ?? 0,
        loading: query.isLoading,
        error: query.error ? getErrorMessage(query.error) : "",
        page,
        setPage,
        reload: () => query.refetch(),
    };
};