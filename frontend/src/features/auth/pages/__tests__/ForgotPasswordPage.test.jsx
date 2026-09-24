import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";

const { toastMock } = vi.hoisted(() => ({
    toastMock: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock("react-toastify", () => ({ toast: toastMock }));
vi.mock("@/features/auth/services/authService", () => ({
    requestPasswordReset: vi.fn(),
}));

import { requestPasswordReset } from "@/features/auth/services/authService";

function renderPage() {
    return render(
        <MemoryRouter initialEntries={["/forgot-password"]}>
            <Routes>
                <Route
                    path="/forgot-password"
                    element={<ForgotPasswordPage />}
                />
                <Route path="/login" element={<div>Login Stub</div>} />
            </Routes>
        </MemoryRouter>
    );
}

describe("ForgotPasswordPage", () => {
    beforeEach(() => {
        toastMock.success.mockReset();
        toastMock.error.mockReset();
        requestPasswordReset.mockReset();
    });

    it("muestra el formulario de email y el vinculo al login", () => {
        renderPage();

        expect(
            screen.getByLabelText("Correo electrónico")
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Enviar enlace" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Inicia sesión" })
        ).toHaveAttribute("href", "/login");
    });

    it("envia el email y muestra el aviso sin revelar cuentas", async () => {
        requestPasswordReset.mockResolvedValue({});
        const user = userEvent.setup();
        renderPage();

        await user.type(
            screen.getByLabelText("Correo electrónico"),
            "pepe@example.com"
        );
        await user.click(
            screen.getByRole("button", { name: "Enviar enlace" })
        );

        await waitFor(() =>
            expect(requestPasswordReset).toHaveBeenCalledWith(
                "pepe@example.com"
            )
        );
        expect(
            await screen.findByText("Revisá tu correo")
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Si existe una cuenta con ese email/)
        ).toBeInTheDocument();
    });

    it("rechaza un email invalido sin llamar al servidor", async () => {
        const user = userEvent.setup();
        renderPage();

        await user.type(
            screen.getByLabelText("Correo electrónico"),
            "no-es-email"
        );
        await user.click(
            screen.getByRole("button", { name: "Enviar enlace" })
        );

        expect(
            await screen.findByText("Correo inválido")
        ).toBeInTheDocument();
        expect(requestPasswordReset).not.toHaveBeenCalled();
    });

    it("avisa si el servidor responde 429", async () => {
        requestPasswordReset.mockRejectedValue({
            response: { status: 429 },
        });
        const user = userEvent.setup();
        renderPage();

        await user.type(
            screen.getByLabelText("Correo electrónico"),
            "pepe@example.com"
        );
        await user.click(
            screen.getByRole("button", { name: "Enviar enlace" })
        );

        expect(
            await screen.findByText(
                "Demasiados intentos. Espera un momento e inténtalo de nuevo."
            )
        ).toBeInTheDocument();
    });
});