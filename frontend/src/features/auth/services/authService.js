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

// La cuenta nace inactiva hasta que el usuario active el link del correo.
export const activateUser = async (uid, token) => {
    await api.post("/auth/users/activation/", { uid, token });
};

export const requestPasswordReset = async (email) => {
    await api.post("/auth/users/reset_password/", { email });
};

export const confirmPasswordReset = async (uid, token, newPassword) => {
    await api.post("/auth/users/reset_password_confirm/", {
        uid,
        token,
        new_password: newPassword,
    });
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

// Solo superuser: emite un access token del usuario objetivo (sin refresh)
// para probar el sistema como ese usuario desde el mismo navegador.
export const impersonateUser = async (userId) => {
    const response = await api.post("/auth/admin/impersonate/", {
        user_id: userId,
    });
    return response.data;
};
