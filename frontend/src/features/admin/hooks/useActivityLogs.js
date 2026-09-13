import { useState } from "react";
import {
    keepPreviousData,
    useQuery,
} from "@tanstack/react-query";
import { getActivityLogs } from "@/features/admin/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const DEFAULT_PAGE_SIZE = 15;

export const useActivityLogs = ({
    action = "",
    entityType = "",
    userId = "",
    from = "",
    to = "",
} = {}) => {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const params = {
        action: action || undefined,
        entityType: entityType || undefined,
        userId: userId || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        page_size: pageSize,
    };
    const query = useQuery({
        queryKey: queryKeys.admin.activityLogs(params),
        queryFn: () => getActivityLogs(params),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });

    const logs = query.data?.results ?? [];
    const count = query.data?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(count / pageSize));

    const handlePageSizeChange = (size) => {
        setPageSize(size);
        setPage(1);
    };

    return {
        logs,
        count,
        totalPages,
        loading: query.isLoading,
        error: query.error ? getErrorMessage(query.error) : "",
        page,
        setPage,
        pageSize,
        handlePageSizeChange,
        reload: () => query.refetch(),
    };
};