import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";

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
    confirmPasswordReset: vi.fn(),
}));

import { confirmPasswordReset } from "@/features/auth/services/authService";

const UID = "MQ";
const TOKEN = "token-de-prueba";

function renderPage() {
    return render(
        <MemoryRouter
            initialEntries={[`/password/reset/confirm/${UID}/${TOKEN}`]}
        >
            <Routes>
                <Route
                    path="/password/reset/confirm/:uid/:token"
                    element={<ResetPasswordPage />}
                />
                <Route path="/login" element={<div>Login Stub</div>} />
            </Routes>
        </MemoryRouter>
    );
}

async function fillPasswords(user, password = "nuevaClave123", confirm = password) {
    await user.type(
        screen.getByLabelText("Contraseña nueva"),
        password
    );
    await user.type(
        screen.getByLabelText("Confirmar contraseña"),
        confirm
    );
}

describe("ResetPasswordPage", () => {
    beforeEach(() => {
        toastMock.success.mockReset();
        toastMock.error.mockReset();
        confirmPasswordReset.mockReset();
    });

    it("confirma el restablecimiento y navega al login", async () => {
        confirmPasswordReset.mockResolvedValue({});
        const user = userEvent.setup();
        renderPage();

        await fillPasswords(user);
        await user.click(
            screen.getByRole("button", { name: "Restablecer contraseña" })
        );

        await waitFor(() =>
            expect(confirmPasswordReset).toHaveBeenCalledWith(
                UID,
                TOKEN,
                "nuevaClave123"
            )
        );
        expect(toastMock.success).toHaveBeenCalled();
        expect(await screen.findByText("Login Stub")).toBeInTheDocument();
    });

    it("rechaza si las contrasenas no coinciden", async () => {
        const user = userEvent.setup();
        renderPage();

        await fillPasswords(user, "nuevaClave123", "otraClave");
        await user.click(
            screen.getByRole("button", { name: "Restablecer contraseña" })
        );

        expect(
            await screen.findByText("Las contraseñas no coinciden")
        ).toBeInTheDocument();
        expect(confirmPasswordReset).not.toHaveBeenCalled();
    });

    it("avisa si el enlace expiro", async () => {
        confirmPasswordReset.mockRejectedValue({
            response: { status: 400 },
        });
        const user = userEvent.setup();
        renderPage();

        await fillPasswords(user);
        await user.click(
            screen.getByRole("button", { name: "Restablecer contraseña" })
        );

        expect(
            await screen.findByText(
                /El enlace es inválido o ya expiró/
            )
        ).toBeInTheDocument();
        expect(toastMock.error).not.toHaveBeenCalled();
    });
});