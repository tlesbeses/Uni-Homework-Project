import { useState } from "react";
import {
    keepPreviousData,
    useQuery,
} from "@tanstack/react-query";
import { getErrorLogs } from "@/features/admin/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useErrorLogs = ({ source = "" } = {}) => {
    const [page, setPage] = useState(1);
    const params = { source: source || undefined, page };
    const query = useQuery({
        queryKey: queryKeys.admin.errorLogs(params),
        queryFn: () => getErrorLogs(params),
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