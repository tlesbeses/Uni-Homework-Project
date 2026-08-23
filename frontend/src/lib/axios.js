import axios from "axios";
import { tokenStorage } from "@/shared/storage/tokenStorage";
import { getCsrfToken } from "@/lib/csrf";

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token);
        }
    });

    failedQueue = [];
};

// Refresca la sesión usando SOLO la cookie HttpOnly (sin cuerpo con tokens).
// Usa una instancia axios "cruda" para no re-disparar los interceptores.
export async function refreshSession() {
    const csrfToken = getCsrfToken();

    const { data } = await axios.post(
        "/auth/jwt/refresh/",
        {},
        {
            withCredentials: true,
            headers: csrfToken ? { "X-CSRFToken": csrfToken } : undefined,
        }
    );

    tokenStorage.setAccessToken(data.access);
    return data.access;
}

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "",
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = tokenStorage.getAccessToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    const method = (config.method || "get").toLowerCase();
    if (!["get", "head", "options"].includes(method)) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            config.headers["X-CSRFToken"] = csrfToken;
        }
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // No hay respuesta del servidor (internet caído, timeout, etc.)
        if (!error.response) {
            return Promise.reject(error);
        }

        // No es un 401 o ya se intentó refrescar
        if (error.response.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // Si ya hay un refresh en curso, espera
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const newAccessToken = await refreshSession();

            processQueue(null, newAccessToken);

            originalRequest.headers.Authorization =
                `Bearer ${newAccessToken}`;

            return api(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError);

            tokenStorage.clear();

            window.location.replace("/login");

            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);
