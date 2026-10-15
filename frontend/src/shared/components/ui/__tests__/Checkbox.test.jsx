import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Checkbox } from "@/shared/components/ui/Checkbox";

describe("Checkbox", () => {
    it("asocia el label con la casilla", () => {
        render(<Checkbox label="Acepto los terminos" name="acceptTerms" />);

        expect(screen.getByLabelText("Acepto los terminos")).toHaveAttribute(
            "type",
            "checkbox"
        );
    });

    it("propaga el register de react-hook-form", () => {
        const register = vi.fn((name) => ({
            name,
            onChange: vi.fn(),
            ref: vi.fn(),
        }));
        render(<Checkbox label="Acepto" name="acceptTerms" register={register} />);

        expect(register).toHaveBeenCalledWith("acceptTerms");
        expect(screen.getByLabelText("Acepto")).toHaveAttribute(
            "name",
            "acceptTerms"
        );
    });

    it("muestra el error cuando se pasa", () => {
        render(
            <Checkbox
                label="Acepto"
                name="acceptTerms"
                error="Debés aceptar"
            />
        );

        expect(screen.getByText("Debés aceptar")).toBeInTheDocument();
    });

    it("permite marcar y desmarcar", () => {
        render(<Checkbox label="Acepto" name="acceptTerms" />);
        const checkbox = screen.getByLabelText("Acepto");

        expect(checkbox).not.toBeChecked();
        fireEvent.click(checkbox);
        expect(checkbox).toBeChecked();
    });
});
