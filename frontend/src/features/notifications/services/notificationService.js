import { api, queryApi } from "@/lib/axios";

export const getNotifications = async (params) => {
    const { signal, ...queryParams } = params ?? {};
    const response = await queryApi.get("/api/notifications/", {
        params: queryParams,
        signal,
    });
    return response.data;
};

export const getUnreadCount = async () => {
    const response = await queryApi.get("/api/notifications/unread-count/");
    return response.data.count;
};

export const markNotificationRead = async (notificationId) => {
    const response = await api.post(
        `/api/notifications/${notificationId}/read/`
    );
    return response.data;
};

export const markAllNotificationsRead = async () => {
    const response = await api.post("/api/notifications/read-all/");
    return response.data.updated;
};