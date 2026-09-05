import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// El interceptor de axios mantiene estado de módulo (isRefreshing, queue,
// caché CSRF en memoria): cada test parte de un import limpio.
beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    vi.restoreAllMocks();
});

function makeToken(payload) {
    return `header.${btoa(JSON.stringify(payload))}.sig`;
}

async function loadAxiosModules() {
    const [{ api, authApi }, csrfModule, storageModule, impersonationModule] =
        await Promise.all([
            import("@/lib/axios"),
            import("@/lib/csrf"),
            import("@/shared/storage/tokenStorage"),
            import("@/lib/impersonation"),
        ]);
    return { api, authApi, ...csrfModule, ...storageModule, ...impersonationModule };
}

describe("interceptor 401 -> refresh", () => {
    it("refresca la sesión y reintenta la petición con el token nuevo", async () => {
        const { api, authApi, setCsrfToken, tokenStorage } =
            await loadAxiosModules();
        setCsrfToken("csrfa");
        tokenStorage.setAccessToken("old-token");

        const mockApi = new MockAdapter(api);
        const mockAuth = new MockAdapter(authApi);

        mockApi
            .onGet("/api/me")
            .replyOnce(401, { detail: "Token expiró" })
            .onGet("/api/me")
            .reply(200, { username: "pepe" });
        mockAuth
            .onPost("/auth/jwt/refresh/")
            .reply(200, { access: "new-token", csrfToken: "csrfb" });

        const response = await api.get("/api/me");

        expect(response.data.username).toBe("pepe");
        const retry = mockApi.history.get[mockApi.history.get.length - 1];
        expect(retry.headers.Authorization).toBe("Bearer new-token");
        expect(tokenStorage.getAccessToken()).toBe("new-token");
        expect(mockAuth.history.post).toHaveLength(1);
    });

    it("si el refresh falla (401), limpia y redirige a /login", async () => {
        const { api, authApi, setCsrfToken, tokenStorage } =
            await loadAxiosModules();
        setCsrfToken("csrfa");
        tokenStorage.setAccessToken("old-token");

        const mockApi = new MockAdapter(api);
        const mockAuth = new MockAdapter(authApi);

        mockApi.onGet("/api/me").reply(401, {});
        mockAuth.onPost("/auth/jwt/refresh/").reply(401, {});

        const promise = api.get("/api/me");

        await expect(promise).rejects.toBeDefined();
        expect(window.location.replace).toHaveBeenCalledWith("/login");
        expect(tokenStorage.getAccessToken()).toBeNull();
    });
});

describe("interceptor 401 -> refresh con CSRF vencido (403)", () => {
    it("re-sincroniza el token CSRF y reintenta una sola vez", async () => {
        const { api, authApi, setCsrfToken, tokenStorage } =
            await loadAxiosModules();
        setCsrfToken("csrf-vencido");
        tokenStorage.setAccessToken("old-token");

        const mockApi = new MockAdapter(api);
        const mockAuth = new MockAdapter(authApi);

        mockApi
            .onGet("/api/me")
            .replyOnce(401, {})
            .onGet("/api/me")
            .reply(200, { ok: true });
        mockAuth
            .onPost("/auth/jwt/refresh/")
            .replyOnce(403, {})
            .onPost("/auth/jwt/refresh/")
            .reply(200, { access: "new-token", csrfToken: "csrf-nuevo" });
        mockAuth.onGet("/auth/csrf/").reply(200, { csrfToken: "csrf-nuevo" });

        const response = await api.get("/api/me");

        expect(response.data.ok).toBe(true);
        // Un 403 (cookie CSRF expirada) obliga a re-sincronizar el doble-envío
        // y reintentar el refresh exactamente UNA vez.
        expect(mockAuth.history.post).toHaveLength(2);
        expect(mockAuth.history.get.filter((r) => r.url === "/auth/csrf/")).toHaveLength(1);
        const retry = mockApi.history.get[mockApi.history.get.length - 1];
        expect(retry.headers.Authorization).toBe("Bearer new-token");
    });
});

describe("interceptor + impersonación", () => {
    it("detecta la pérdida de la sesión de prueba y avisa (handler)", async () => {
        const { api, authApi, setCsrfToken, tokenStorage, impersonation } =
            await loadAxiosModules();
        setCsrfToken("csrfa");
        tokenStorage.setAccessToken("token-impersonado");

        impersonation.start({
            adminAccessToken: "token-admin",
            adminProfile: { username: "root" },
            impersonatedUserId: 5,
            impersonatedUser: { id: 5 },
        });

        const lost = vi.fn();
        impersonation.setLostHandler(lost);

        const mockApi = new MockAdapter(api);
        const mockAuth = new MockAdapter(authApi);
        mockApi
            .onGet("/api/me")
            .replyOnce(401, {})
            .onGet("/api/me")
            .reply(200, { ok: true });
        mockAuth
            .onPost("/auth/jwt/refresh/")
            // El refresh usa la cookie del admin: vuelve SU token (sin claim
            // impersonates), revelando que la sesión de prueba caducó.
            .reply(200, { access: "token-admin", csrfToken: "csrfb" });

        await api.get("/api/me");

        expect(lost).toHaveBeenCalledTimes(1);
    });

    it("no avisa si el refresh devuelve un token que sigue impersonando", async () => {
        const { api, authApi, setCsrfToken, tokenStorage, impersonation } =
            await loadAxiosModules();
        setCsrfToken("csrfa");
        tokenStorage.setAccessToken("token-impersonado");

        impersonation.start({
            adminAccessToken: "token-admin",
            adminProfile: { username: "root" },
            impersonatedUserId: 5,
            impersonatedUser: { id: 5 },
        });

        const lost = vi.fn();
        impersonation.setLostHandler(lost);

        const mockApi = new MockAdapter(api);
        const mockAuth = new MockAdapter(authApi);
        mockApi
            .onGet("/api/me")
            .replyOnce(401, {})
            .onGet("/api/me")
            .reply(200, { ok: true });
        mockAuth
            .onPost("/auth/jwt/refresh/")
            .reply(200, { access: makeToken({ user_id: 5 }), csrfToken: "csrfb" });

        await api.get("/api/me");

        expect(lost).not.toHaveBeenCalled();
    });
});