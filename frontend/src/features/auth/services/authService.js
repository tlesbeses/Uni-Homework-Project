import { api } from "@/lib/axios";
import { setCsrfToken } from "@/lib/csrf";

export const ensureCsrfToken = async () => {
    const response = await api.get("/auth/csrf/");
    // Con API en otro origen la cookie no es legible por JS; el token
    // necesario para el header X-CSRFToken llega en el cuerpo.
    setCsrfToken(response.data.csrfToken);
};

export const loginUser = async (credentials) => {
    const response = await api.post("/auth/login/", credentials);
    // El login rota el CSRF; la respuesta trae el nuevo valor.
    setCsrfToken(response.data.csrfToken);
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
