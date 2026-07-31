import axios from "axios";
import { tokenStorage } from "@/shared/storage/tokenStorage";
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

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/",
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use((config) => {
    const token = tokenStorage.getAccessToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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

        const refreshToken = tokenStorage.getRefreshToken();
        if (!refreshToken) {          //
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
            const refreshToken = tokenStorage.getRefreshToken();

            if (!refreshToken) {
                throw new Error("Refresh token not found.");
            }

            // Endpoint de SimpleJWT
            const { data } = await axios.post(
                `${api.defaults.baseURL}/auth/jwt/refresh/`,
                {
                    refresh: refreshToken,
                }
            );

            const newAccessToken = data.access;
            const newRefreshToken = data.refresh;

            tokenStorage.setRefreshToken(newRefreshToken);

            tokenStorage.setAccessToken(newAccessToken);

            api.defaults.headers.common.Authorization =
                `Bearer ${newAccessToken}`;

            processQueue(null, newAccessToken);

            originalRequest.headers.Authorization =
                `Bearer ${newAccessToken}`;

            return api(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError);

            tokenStorage.clear();

            delete api.defaults.headers.common.Authorization;

            window.location.replace("/login");

            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);