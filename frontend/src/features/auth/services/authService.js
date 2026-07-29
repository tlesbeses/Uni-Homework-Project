import { api } from "@/lib/axios";


export const loginRequest = async (credentials) => {
    const response = await api.post(
        "auth/login/", credentials
    );

    return response.data;
};


export const registerUser = async (userData) => {
    const response = await api.post(
        "auth/users/",
        userData
    );

    return response.data;
};

export const getUserProfile = async () => {
    const response = await api.get(
        "auth/users/me/"
    );

    return response.data;
};