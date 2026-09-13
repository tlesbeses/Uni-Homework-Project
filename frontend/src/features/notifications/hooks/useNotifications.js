import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getNotifications } from "@/features/notifications/services/notificationService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const DEFAULT_PAGE_SIZE = 15;

export const useNotifications = () => {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [unreadOnly, setUnreadOnly] = useState(false);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.notifications.list({ page, pageSize, unreadOnly }),
        queryFn: () =>
            getNotifications({
                page,
                page_size: pageSize,
                unread_only: unreadOnly || undefined,
            }).then((data) => {
                const items = Array.isArray(data.results)
                    ? data.results
                    : [];
                const count =
                    typeof data.count === "number" ? data.count : items.length;
                return { items, count };
            }),
        // Mantiene visible la página anterior al navegar, sin spinner.
        placeholderData: keepPreviousData,
    });

    const notifications = data?.items ?? [];
    const count = data?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(count / pageSize));

    const handlePageSizeChange = (size) => {
        setPageSize(size);
        setPage(1);
    };

    return {
        notifications,
        count,
        totalPages,
        page,
        setPage,
        pageSize,
        handlePageSizeChange,
        unreadOnly,
        setUnreadOnly,
        loading: isLoading,
        error: error ? getErrorMessage(error) : "",
        reload: refetch,
    };
};