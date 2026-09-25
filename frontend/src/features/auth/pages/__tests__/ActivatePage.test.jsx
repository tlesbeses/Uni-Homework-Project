import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ActivatePage } from "@/features/auth/pages/ActivatePage";

vi.mock("@/features/auth/services/authService", () => ({
    activateUser: vi.fn(),
    resendUserActivation: vi.fn(),
}));

import {
    activateUser,
    resendUserActivation,
} from "@/features/auth/services/authService";

const UID = "MQ";
const TOKEN = "token-de-prueba";

function renderPage() {
    return render(
        <MemoryRouter initialEntries={[`/activate/${UID}/${TOKEN}`]}>
            <Routes>
                <Route
                    path="/activate/:uid/:token"
                    element={<ActivatePage />}
                />
                <Route path="/login" element={<div>Login Stub</div>} />
            </Routes>
        </MemoryRouter>
    );
}

describe("ActivatePage", () => {
    beforeEach(() => {
        activateUser.mockReset();
        resendUserActivation.mockReset();
    });

    it("activa la cuenta y muestra el éxito con botón al login", async () => {
        activateUser.mockResolvedValue({});
        renderPage();

        expect(
            screen.getByText(/Verificando tu cuenta/)
        ).toBeInTheDocument();

        expect(activateUser).toHaveBeenCalledWith(UID, TOKEN);

        expect(
            await screen.findByText("¡Cuenta verificada!")
        ).toBeInTheDocument();

        const loginButton = screen.getByRole("link", {
            name: "Iniciar sesión",
        });
        expect(loginButton).toHaveAttribute("href", "/login");
    });

    it("muestra error si el enlace es inválido", async () => {
        activateUser.mockRejectedValue({
            response: { status: 400 },
        });
        renderPage();

        expect(
            await screen.findByText("No se pudo verificar la cuenta")
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "El enlace de activación es inválido o ya fue utilizado."
            )
        ).toBeInTheDocument();
    });

    it("muestra mensaje de reintento si el servidor responde 429", async () => {
        activateUser.mockRejectedValue({
            response: { status: 429 },
        });
        renderPage();

        expect(
            await screen.findByText("No se pudo verificar la cuenta")
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "Demasiados intentos. Espera un momento e inténtalo de nuevo."
            )
        ).toBeInTheDocument();
    });

    it("ofrece reenviar la activación cuando el enlace falla", async () => {
        activateUser.mockRejectedValue({
            response: { status: 400 },
        });
        resendUserActivation.mockResolvedValue({});
        const user = userEvent.setup();
        renderPage();

        const resendButton = await screen.findByRole("button", {
            name: "¿El enlace venció? Reenviar",
        });
        await user.click(resendButton);

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
});