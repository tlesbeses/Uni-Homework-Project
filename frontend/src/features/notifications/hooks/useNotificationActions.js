import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    markAllNotificationsRead,
    markNotificationRead,
} from "@/features/notifications/services/notificationService";
import { queryKeys } from "@/lib/queryKeys";

export const useMarkNotificationRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: markNotificationRead,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: queryKeys.notifications.all,
            }),
    });
};

export const useMarkAllNotificationsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: markAllNotificationsRead,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: queryKeys.notifications.all,
            }),
    });
};