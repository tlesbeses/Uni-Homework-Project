import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InputField } from "@/shared/components/ui/InputField";

describe("InputField", () => {
    it("renderiza el label asociado al input", () => {
        render(<InputField label="Contraseña" name="password" type="password" />);
        expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
            "type",
            "password"
        );
    });

    it("agrega un toggle para mostrar/ocultar en campos de contraseña", () => {
        render(<InputField label="Contraseña" name="password" type="password" />);
        const button = screen.getByRole("button", {
            name: "Mostrar contraseña",
        });
        expect(button).toBeInTheDocument();
        expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
            "type",
            "password"
        );

        fireEvent.click(button);
        expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "text");
        expect(
            screen.getByRole("button", { name: "Ocultar contraseña" })
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
        expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
            "type",
            "password"
        );
    });

    it("no agrega toggle en campos de texto", () => {
        render(<InputField label="Usuario" name="username" />);
        expect(screen.getByLabelText("Usuario")).toHaveAttribute("type", "text");
        expect(
            screen.queryByRole("button", { name: "Mostrar contraseña" })
        ).not.toBeInTheDocument();
    });

    it("propaga los props de react-hook-form register al input", () => {
        const register = vi.fn((name) => ({ name, onChange: vi.fn(), ref: vi.fn() }));
        render(
            <InputField label="Usuario" name="username" register={register} />
        );
        expect(register).toHaveBeenCalledWith("username");
        expect(screen.getByLabelText("Usuario")).toHaveAttribute("name", "username");
    });

    it("muestra el error y oculta el helpText", () => {
        render(
            <InputField
                label="Usuario"
                name="username"
                error="Campo requerido"
                helpText="Ayuda"
            />
        );
        expect(screen.getByText("Campo requerido")).toBeInTheDocument();
        expect(screen.queryByText("Ayuda")).not.toBeInTheDocument();
    });
});