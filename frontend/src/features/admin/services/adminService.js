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