import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";

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
    registerUser: vi.fn(),
}));

import { registerUser } from "@/features/auth/services/authService";

function renderPage() {
    return render(
        <MemoryRouter initialEntries={["/signup"]}>
            <Routes>
                <Route path="/signup" element={<RegisterPage />} />
                <Route path="/login" element={<div>Login Stub</div>} />
            </Routes>
        </MemoryRouter>
    );
}

const validValues = {
    username: "pepin",
    first_name: "Pepe",
    last_name: "Perez",
    email: "pepe@example.com",
    password: "clave123",
    confirmPassword: "clave123",
};

async function fillForm(user) {
    await user.type(
        screen.getByLabelText("Nombre de usuario"),
        validValues.username
    );
    await user.type(screen.getByLabelText("Nombre"), validValues.first_name);
    await user.type(screen.getByLabelText("Apellido"), validValues.last_name);
    await user.type(screen.getByLabelText("Correo electrónico"), validValues.email);
    await user.type(screen.getByLabelText("Contraseña"), validValues.password);
    await user.type(
        screen.getByLabelText("Confirmar contraseña"),
        validValues.confirmPassword
    );
}

describe("RegisterPage", () => {
    beforeEach(() => {
        toastMock.success.mockReset();
        toastMock.error.mockReset();
        registerUser.mockReset();
    });

    it("muestra el formulario de creacion y el vinculo al login", () => {
        renderPage();

        expect(
            screen.getByRole("heading", { name: "Crear Cuenta" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Inicia sesión" })
        ).toHaveAttribute("href", "/login");
    });

    it("registra al usuario sin confirmPassword y navega al login", async () => {
        registerUser.mockResolvedValue({});
        const user = userEvent.setup();
        renderPage();

        await fillForm(user);
        await user.click(screen.getByRole("button", { name: "Registrarse" }));

        await waitFor(() =>
            expect(registerUser).toHaveBeenCalledWith({
                username: "pepin",
                first_name: "Pepe",
                last_name: "Perez",
                email: "pepe@example.com",
                password: "clave123",
            })
        );
        expect(toastMock.success).toHaveBeenCalledWith(
            "Usuario registrado con éxito"
        );
        expect(await screen.findByText("Login Stub")).toBeInTheDocument();
    });

    it("rechaza el registro si las contrasenas no coinciden", async () => {
        const user = userEvent.setup();
        renderPage();

        await fillForm(user);
        await user.clear(screen.getByLabelText("Confirmar contraseña"));
        await user.type(
            screen.getByLabelText("Confirmar contraseña"),
            "otra-clave"
        );
        await user.click(screen.getByRole("button", { name: "Registrarse" }));

        expect(
            await screen.findByText("Las contraseñas no coinciden")
        ).toBeInTheDocument();
        expect(registerUser).not.toHaveBeenCalled();
    });

    it("muestra los errores del servidor bajo cada campo", async () => {
        registerUser.mockRejectedValue({
            response: {
                data: {
                    username: ["Ya existe una cuenta con ese usuario."],
                    email: ["El correo ya está en uso."],
                },
            },
        });
        const user = userEvent.setup();
        renderPage();

        await fillForm(user);
        await user.click(screen.getByRole("button", { name: "Registrarse" }));

        expect(
            await screen.findByText("Ya existe una cuenta con ese usuario.")
        ).toBeInTheDocument();
        expect(
            screen.getByText("El correo ya está en uso.")
        ).toBeInTheDocument();
    });
});