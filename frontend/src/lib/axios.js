import axios from "axios";
import { tokenStorage } from "@/shared/storage/tokenStorage";
import { getCsrfToken, setCsrfToken } from "@/lib/csrf";

let isRefreshing = false;
let failedQueue = [];

// Misma configuración base para ambas instancias: respeta VITE_API_URL,
// de modo que el refresh funcione también con API en otro origen.
const BASE_URL = import.meta.env.VITE_API_URL || "";

// Instancia SIN interceptores para las llamadas de autenticación:
// evita recursión y hereda baseURL/withCredentials.
export const authApi = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
});

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
export async function refreshSession() {
    const csrfToken = getCsrfToken();

    const { data } = await authApi.post(
        "/auth/jwt/refresh/",
        {},
        {
            headers: csrfToken ? { "X-CSRFToken": csrfToken } : undefined,
        }
    );

    tokenStorage.setAccessToken(data.access);
    // La rotación del refresh rota también el CSRF; guardamos el nuevo valor.
    setCsrfToken(data.csrfToken);
    return data.access;
}

export const api = axios.create({
    baseURL: BASE_URL,
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
