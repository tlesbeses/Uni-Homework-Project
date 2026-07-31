import { api } from "@/lib/axios";

export const updateUserProfile = async (userData) => {
    const response = await api.patch("auth/users/me/", userData);

    return response.data;
};

export const changeUserPassword = async (passwordData) => {
    const response = await api.post("auth/users/set_password/", passwordData);

    return response.data;
};
