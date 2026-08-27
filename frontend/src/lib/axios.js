import axios from "axios";
import { tokenStorage } from "@/shared/storage/tokenStorage";
import { getCsrfToken, setCsrfToken } from "@/lib/csrf";
import { getCached, setCache, cacheKey, invalidateCache } from "@/lib/apiCache";

let isRefreshing = false;
let failedQueue = [];

const BASE_URL = import.meta.env.VITE_API_URL || "";

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
    setCsrfToken(data.csrfToken);
    return data.access;
}

export const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
});

// ── Throttle queue ──────────────────────────────────────────────────
let throttleExpiry = 0;
let onThrottleUpdate = null;

export function setThrottleListener(listener) {
    onThrottleUpdate = listener;
}

function enterThrottled(seconds) {
    throttleExpiry = Date.now() + seconds * 1000;
    if (onThrottleUpdate) {
        onThrottleUpdate(seconds);
    }
    return new Promise((resolve) => {
        setTimeout(() => {
            throttleExpiry = 0;
            if (onThrottleUpdate) {
                onThrottleUpdate(0);
            }
            resolve();
        }, seconds * 1000);
    });
}

// ── Request interceptor ─────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
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

    // Cache for GET requests
    if (method === "get") {
        const key = cacheKey("get", config.url, config.params);
        const cached = getCached(key);
        if (cached !== undefined) {
            config.adapter = () =>
                Promise.resolve({
                    data: cached,
                    status: 200,
                    statusText: "OK",
                    headers: {},
                    config: { ...config, _fromCache: true },
                });
        }
    }

    // Wait if currently throttled
    if (throttleExpiry > Date.now()) {
        const remaining = Math.ceil((throttleExpiry - Date.now()) / 1000);
        await enterThrottled(remaining);
    }

    return config;
});

// ── Response interceptor ────────────────────────────────────────────
api.interceptors.response.use(
    (response) => {
        const method = (response.config.method || "get").toLowerCase();
        if (method === "get" && !response.config._fromCache) {
            // Solo re-cachear respuestas realmente obtenidas de la red. Las que
            // vienen de caché ya tienen su expiración; al re-cachearlas con los
            // mismos datos viejos se renovaba el TTL y la obsolescencia nunca sanaba.
            const key = cacheKey(
                "get",
                response.config.url,
                response.config.params
            );
            setCache(key, response.data);
        } else if (method !== "get") {
            invalidateCache(response.config.url);
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (!error.response) {
            return Promise.reject(error);
        }

        // ── 429 Throttle ────────────────────────────────────────────
        if (error.response.status === 429) {
            const retryAfter = parseInt(
                error.response.headers?.["retry-after"] || "30",
                10
            );
            // Nunca reintentar peticiones de /auth (login, refresh) en bucle;
            // y solo reintentar las demás un máximo de veces para no dejar la
            // app bloqueada decenas de segundos.
            const isAuth = (originalRequest.url || "").includes("/auth/");
            const retries = (originalRequest._retryCount || 0) + 1;
            if (isAuth || retries > 2) {
                return Promise.reject(error);
            }
            originalRequest._retryCount = retries;
            await enterThrottled(retryAfter);
            return api(originalRequest);
        }

        // ── 401 Auth ────────────────────────────────────────────────
        if (
            error.response.status !== 401 ||
            originalRequest._retry ||
            originalRequest.url?.includes("/auth/")
        ) {
            return Promise.reject(error);
        }

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
