import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAdminUsers } from "@/features/admin/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const DEFAULT_PAGE_SIZE = 9;

export const useAdminUsers = ({ search = "", role = "" } = {}) => {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    const params = {
        search: search || undefined,
        role: role || undefined,
        page,
        page_size: pageSize,
    };

    const query = useQuery({
        queryKey: queryKeys.admin.users(params),
        queryFn: () =>
            getAdminUsers(params).then((data) => {
                const items = Array.isArray(data.results)
                    ? data.results
                    : Array.isArray(data)
                      ? data
                      : [];
                const count =
                    typeof data.count === "number" ? data.count : items.length;
                return { items, count };
            }),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });

    const users = query.data?.items ?? [];
    const count = query.data?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(count / pageSize));

    const handlePageSizeChange = (size) => {
        setPageSize(size);
        setPage(1);
    };

    return {
        users,
        count,
        totalPages,
        page,
        setPage,
        pageSize,
        handlePageSizeChange,
        loading: query.isLoading,
        error: query.error ? getErrorMessage(query.error) : "",
        reload: () => query.refetch(),
    };
};