import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LoginPage } from "@/features/auth/pages/LoginPage";

const { toastMock } = vi.hoisted(() => ({
    toastMock: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

const { authMock } = vi.hoisted(() => ({
    authMock: {
        user: null,
        isLoading: false,
        isAuthenticated: false,
        isTeacher: false,
        isStudent: false,
        isAdmin: false,
        login: vi.fn(),
    },
}));

vi.mock("react-toastify", () => ({ toast: toastMock }));
vi.mock("@/features/auth/providers/AuthProvider", () => ({
    useAuth: () => authMock,
}));
vi.mock("@/features/auth/services/authService", () => ({
    resendUserActivation: vi.fn(),
}));

import { resendUserActivation } from "@/features/auth/services/authService";

function renderPage() {
    return render(
        <MemoryRouter initialEntries={["/login"]}>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<div>Dashboard Stub</div>} />
            </Routes>
        </MemoryRouter>
    );
}

describe("LoginPage", () => {
    beforeEach(() => {
        toastMock.success.mockReset();
        toastMock.error.mockReset();
        authMock.login.mockReset();
        resendUserActivation.mockReset();
    });

    it("muestra el formulario y el vinculo al registro", () => {
        renderPage();

        expect(
            screen.getByRole("heading", { name: "EduNotas" })
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText("Nombre de Usuario")
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Registrarme gratis" })
        ).toHaveAttribute("href", "/signup");
        expect(
            screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" })
        ).toHaveAttribute("href", "/forgot-password");
    });

    it("envia credenciales, avisa y navega al dashboard", async () => {
        authMock.login.mockResolvedValue({ access: "token-nuevo" });
        const user = userEvent.setup();
        renderPage();

        await user.type(
            screen.getByLabelText("Nombre de Usuario"),
            "root"
        );
        await user.type(screen.getByLabelText("Contraseña"), "ultrasecreto");
        await user.click(
            screen.getByRole("button", { name: "Iniciar Sesión" })
        );

        await waitFor(() =>
            expect(authMock.login).toHaveBeenCalledWith({
                username: "root",
                password: "ultrasecreto",
            })
        );
        expect(toastMock.success).toHaveBeenCalledWith(
            "Inicio de sesión exitoso"
        );
        expect(
            await screen.findByText("Dashboard Stub")
        ).toBeInTheDocument();
    });

    it("rechaza campos vacios sin llamar al servidor", async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(
            screen.getByRole("button", { name: "Iniciar Sesión" })
        );

        expect(
            await screen.findByText("El usuario es obligatorio")
        ).toBeInTheDocument();
        expect(
            screen.getByText("La contraseña es obligatoria")
        ).toBeInTheDocument();
        expect(authMock.login).not.toHaveBeenCalled();
    });

    it("avisa con credenciales incorrectas cuando la API responde 401", async () => {
        authMock.login.mockRejectedValue({ response: { status: 401 } });
        const user = userEvent.setup();
        renderPage();

        await user.type(screen.getByLabelText("Nombre de Usuario"), "root");
        await user.type(screen.getByLabelText("Contraseña"), "mala");
        await user.click(
            screen.getByRole("button", { name: "Iniciar Sesión" })
        );

        await waitFor(() =>
            expect(toastMock.error).toHaveBeenCalledWith(
                "Usuario o contraseña incorrectos"
            )
        );
        expect(authMock.login).toHaveBeenCalled();
    });

    it("reenvía el correo de activación desde el login", async () => {
        resendUserActivation.mockResolvedValue({});
        const user = userEvent.setup();
        renderPage();

        await user.click(
            screen.getByRole("button", {
                name: "¿No te llegó el correo? Reenviar",
            })
        );
        await user.type(
            screen.getByLabelText("Correo electrónico"),
            "nuevo@example.com"
        );
        await user.click(
            screen.getByRole("button", { name: "Reenviar enlace" })
        );

        await waitFor(() =>
            expect(resendUserActivation).toHaveBeenCalledWith(
                "nuevo@example.com"
            )
        );
        expect(
            screen.getByText(/Si existe una cuenta sin activar/)
        ).toBeInTheDocument();
    });

    it("muestra el aviso de reintento si el reenvío responde 429", async () => {
        resendUserActivation.mockRejectedValue({
            response: { status: 429 },
        });
        const user = userEvent.setup();
        renderPage();

        await user.click(
            screen.getByRole("button", {
                name: "¿No te llegó el correo? Reenviar",
            })
        );
        await user.type(
            screen.getByLabelText("Correo electrónico"),
            "nuevo@example.com"
        );
        await user.click(
            screen.getByRole("button", { name: "Reenviar enlace" })
        );

        expect(
            await screen.findByText(
                "Demasiados intentos. Espera un momento e inténtalo de nuevo."
            )
        ).toBeInTheDocument();
        expect(resendUserActivation).toHaveBeenCalled();
    });
});