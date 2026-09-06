import { useQuery } from "@tanstack/react-query";
import { getUnreadCount } from "@/features/notifications/services/notificationService";
import { queryKeys } from "@/lib/queryKeys";

export const useUnreadCount = () =>
    useQuery({
        queryKey: queryKeys.notifications.unreadCount(),
        queryFn: getUnreadCount,
        // Polling del badge de la campana cada 30s (solo pestaña enfocada).
        refetchInterval: 30_000,
    });