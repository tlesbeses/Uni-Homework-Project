import { api } from "@/lib/axios";

export const ensureCsrfToken = async () => {
    await api.get("/auth/csrf/");
};

export const loginUser = async (credentials) => {
    const response = await api.post("/auth/login/", credentials);
    return response.data;
};

export const registerUser = async (userData) => {
    const response = await api.post("/auth/users/", userData);
    return response.data;
};

// El refresh token viaja en la cookie HttpOnly; no se envía en el cuerpo.
export const logoutUser = async () => {
    const response = await api.post("/auth/jwt/blacklist/");
    return response.data;
};

export const getUserProfile = async () => {
    const response = await api.get("/auth/users/me/");
    return response.data;
};

export const updateUserProfile = async (userData) => {
    const response = await api.patch("/auth/users/me/", userData);
    return response.data;
};

export const changeUserPassword = async (passwordData) => {
    const response = await api.post("/auth/users/set_password/", passwordData);
    return response.data;
};
