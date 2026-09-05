import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getNotifications } from "@/features/notifications/services/notificationService";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const PAGE_SIZE = 15;

export const useNotifications = () => {
    const [page, setPage] = useState(1);
    const [unreadOnly, setUnreadOnly] = useState(false);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.notifications.list({ page, unreadOnly }),
        queryFn: () =>
            getNotifications({
                page,
                page_size: PAGE_SIZE,
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
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

    return {
        notifications,
        count,
        page,
        totalPages,
        setPage,
        unreadOnly,
        setUnreadOnly,
        loading: isLoading,
        error: error ? getErrorMessage(error) : "",
        reload: refetch,
    };
};