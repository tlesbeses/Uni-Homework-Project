import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "./AuthProvider";
import * as authService from "@/features/auth/services/authService";
import { refreshSession } from "@/lib/axios";
import { impersonation } from "@/lib/impersonation";
import { tokenStorage } from "@/shared/storage/tokenStorage";

vi.mock("@/lib/axios", () => ({
    refreshSession: vi.fn(),
}));

vi.mock("@/features/auth/services/authService", () => ({
    ensureCsrfToken: vi.fn(),
    getUserProfile: vi.fn(),
    loginUser: vi.fn(),
    logoutUser: vi.fn(),
    impersonateUser: vi.fn(),
    registerUser: vi.fn(),
    updateUserProfile: vi.fn(),
    changeUserPassword: vi.fn(),
}));

function Probe() {
    const auth = useAuth();
    return (
        <div>
            <span data-testid="user">
                {auth.user ? auth.user.username : "none"}
            </span>
            <span data-testid="roles">
                {auth.isTeacher ? "teacher" : ""}
                {auth.isAdmin ? "admin" : ""}
            </span>
            <span data-testid="loading">{String(auth.isLoading)}</span>
            <button
                data-testid="login"
                onClick={() => auth.login({ username: "pepe", password: "x" })}
            >
                login
            </button>
            <button data-testid="logout" onClick={auth.logout}>
                logout
            </button>
        </div>
    );
}

function renderAuth() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <Probe />
            </AuthProvider>
        </QueryClientProvider>
    );
}

describe("AuthProvider", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        tokenStorage.clear();
    });

    it("restaura la sesión al arrancar si el refresh responde", async () => {
        authService.ensureCsrfToken.mockResolvedValue();
        refreshSession.mockImplementation(async () => {
            tokenStorage.setAccessToken("access-token");
            return "access-token";
        });
        authService.getUserProfile.mockResolvedValue({
            username: "root",
            roles: ["Teacher"],
            is_superuser: false,
        });

        renderAuth();

        await waitFor(() =>
            expect(screen.getByTestId("user")).toHaveTextContent("root")
        );
        expect(screen.getByTestId("roles")).toHaveTextContent("teacher");
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
        expect(tokenStorage.getAccessToken()).toBe("access-token");
    });

    it("deja al usuario anónimo si no hay sesión", async () => {
        authService.ensureCsrfToken.mockResolvedValue();
        refreshSession.mockRejectedValue(new Error("sin sesión"));

        renderAuth();

        await waitFor(() =>
            expect(screen.getByTestId("user")).toHaveTextContent("none")
        );
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    it("hace login y guarda el access token en memoria", async () => {
        authService.ensureCsrfToken.mockResolvedValue();
        refreshSession.mockRejectedValue(new Error("sin sesión"));
        authService.loginUser.mockResolvedValue({
            access: "token-nuevo",
            user: { username: "pepe", roles: [], is_superuser: false },
        });

        renderAuth();
        await waitFor(() =>
            expect(screen.getByTestId("user")).toHaveTextContent("none")
        );

        const user = userEvent.setup();
        await user.click(screen.getByTestId("login"));

        await waitFor(() =>
            expect(screen.getByTestId("user")).toHaveTextContent("pepe")
        );
        expect(tokenStorage.getAccessToken()).toBe("token-nuevo");
    });

    it("hace logout, limpia tokens y redirige a /login", async () => {
        authService.ensureCsrfToken.mockResolvedValue();
        refreshSession.mockRejectedValue(new Error("sin sesión"));
        authService.logoutUser.mockRejectedValue(new Error("offline"));
        tokenStorage.setAccessToken("token-viejo");

        renderAuth();
        await waitFor(() =>
            expect(screen.getByTestId("user")).toHaveTextContent("none")
        );

        const user = userEvent.setup();
        await user.click(screen.getByTestId("logout"));

        await waitFor(() =>
            expect(window.location.assign).toHaveBeenCalledWith("/login")
        );
        expect(tokenStorage.getAccessToken()).toBeNull();
    });

    it("restaura al admin cuando la sesión de prueba se pierde", async () => {
        authService.ensureCsrfToken.mockResolvedValue();
        refreshSession.mockResolvedValue("access-token");
        authService.getUserProfile.mockResolvedValue({
            username: "pepe",
            roles: ["Student"],
            is_superuser: false,
        });
        tokenStorage.setAccessToken("token-probandose");

        impersonation.start({
            adminAccessToken: "token-admin",
            adminProfile: { username: "root", roles: [], is_superuser: true },
            impersonatedUserId: 7,
            impersonatedUser: { id: 7 },
        });

        renderAuth();
        await waitFor(() =>
            expect(screen.getByTestId("user")).toHaveTextContent("pepe")
        );

        act(() => {
            impersonation.notifyLost();
        });

        await waitFor(() =>
            expect(screen.getByTestId("user")).toHaveTextContent("root")
        );
        expect(tokenStorage.getAccessToken()).toBe("token-admin");
    });
});