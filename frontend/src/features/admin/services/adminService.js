import { api } from "@/lib/axios";

export const getAdminUsers = async (params) => {
    const { signal, search, role, ...queryParams } = params ?? {};
    const query = { ...queryParams };
    if (search) {
        query.search = search;
    }
    if (role) {
        query.role = role;
    }
    const response = await api.get("/auth/admin/users/", {
        params: query,
        signal,
    });
    return response.data;
};

export const setUserActive = async (userId, isActive) => {
    const response = await api.patch(
        `/auth/admin/users/${userId}/`,
        { is_active: isActive }
    );
    return response.data;
};

export const setUserRole = async (userId, role) => {
    const response = await api.patch(
        `/auth/admin/users/${userId}/`,
        { role }
    );
    return response.data;
};

export const getActivityLogs = async (params) => {
    const { signal, action, entityType, userId, from, to, page, pageSize, ...queryParams } = params ?? {};
    const query = { ...queryParams };
    if (action) {
        query.action = action;
    }
    if (entityType) {
        query.entity_type = entityType;
    }
    if (userId) {
        query.user_id = userId;
    }
    if (from) {
        query.from = from;
    }
    if (to) {
        query.to = to;
    }
    if (page) {
        query.page = page;
    }
    if (pageSize) {
        query.page_size = pageSize;
    }
    const response = await api.get("/auth/admin/activity/", {
        params: query,
        signal,
    });
    return response.data;
};

export const getErrorLogs = async (params) => {
    const { signal, source, page, pageSize, ...queryParams } = params ?? {};
    const query = { ...queryParams };
    if (source) {
        query.source = source;
    }
    if (page) {
        query.page = page;
    }
    if (pageSize) {
        query.page_size = pageSize;
    }
    const response = await api.get("/api/errors/", {
        params: query,
        signal,
    });
    return response.data;
};

export const getErrorLog = async (errorId, opts) => {
    const response = await api.get(`/api/errors/${errorId}/`, {
        signal: opts?.signal,
    });
    return response.data;
};