import axios from "axios";

// Reporter independiente de la instancia `api`: no debe arrastrar los
// interceptores de auth/cache del resto de la app (un fallo del token no
// debe disparar refresh ni redirects mientras la UI ya se está cayendo).
const BASE_URL = import.meta.env.VITE_API_URL || "";
const reportApi = axios.create({ baseURL: BASE_URL, withCredentials: true });

const recent = new Map();
const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 5;

function allow(key) {
    const now = Date.now();
    const record = recent.get(key);
    if (!record || now - record.first >= WINDOW_MS) {
        recent.set(key, { first: now, count: 1 });
        if (recent.size > 100) {
            const oldest = [...recent.entries()].sort(
                (a, b) => a[1].first - b[1].first
            )[0];
            if (oldest) {
                recent.delete(oldest[0]);
            }
        }
        return true;
    }
    if (record.count >= MAX_PER_WINDOW) {
        return false;
    }
    record.count += 1;
    return true;
}

// Cancelaciones DOM/axios no son errores de la app.
const ignoredKinds = new Set(["AbortError", "CanceledError", "Cancel"]);

/**
 * Envía un error del frontend a POST /api/errors/ (endpoint AllowAny).
 * Devuelve el `error_id` público para mostrarlo como código de soporte,
 * o "" si no se pudo reportar.
 */
export async function reportError({
    kind = "Error",
    message = "",
    stack = "",
    component = "",
    url = "",
    errorIdRef = "",
} = {}) {
    if (ignoredKinds.has(kind)) {
        return "";
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return "";
    }
    const key = `${kind}:${String(message).slice(0, 120)}`;
    if (!allow(key)) {
        return "";
    }
    try {
        const response = await reportApi.post("/api/errors/", {
            kind: String(kind).slice(0, 200),
            message: String(message).slice(0, 5000),
            stack: String(stack).slice(0, 40000),
            component: String(component).slice(0, 200),
            url:
                String(url || (typeof window !== "undefined" ? window.location.href : "")).slice(0, 500),
            error_id_ref: String(errorIdRef).slice(0, 16),
        });
        return response.data?.error_id ?? "";
    } catch {
        return "";
    }
}

export function reportErrorFromEvent(error, component = "") {
    if (!error) {
        return "";
    }
    return reportError({
        kind: error?.name || "Error",
        message: error?.message || String(error),
        stack: error?.stack || "",
        component,
    });
}

export function installGlobalErrorListeners() {
    const onError = (event) => {
        reportErrorFromEvent(
            event.error ?? new Error(`Error no capturado: ${event.message ?? ""}`)
        );
    };
    const onRejection = (event) => {
        reportErrorFromEvent(event.reason);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRejection);
    };
}