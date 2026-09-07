import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TextareaField } from "@/shared/components/ui/TextareaField";

describe("TextareaField", () => {
    it("renderiza label y textarea", () => {
        render(
            <TextareaField label="Descripción" name="description" placeholder="Detalle..." />
        );
        expect(screen.getByLabelText("Descripción")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Detalle...")).toBeInTheDocument();
    });

    it("propaga los props de react-hook-form register y rows", () => {
        const register = vi.fn((name) => ({ name, onChange: vi.fn(), ref: vi.fn() }));
        render(
            <TextareaField label="Descripción" name="description" rows={3} register={register} />
        );
        expect(register).toHaveBeenCalledWith("description");
        expect(screen.getByRole("textbox")).toHaveAttribute("name", "description");
        expect(screen.getByRole("textbox")).toHaveAttribute("rows", "3");
    });

    it("muestra el error y oculta el helpText", () => {
        render(
            <TextareaField
                label="Descripción"
                name="description"
                error="Muy corto"
                helpText="Se guardará al guardar"
            />
        );
        expect(screen.getByText("Muy corto")).toBeInTheDocument();
        expect(screen.queryByText("Se guardará al guardar")).not.toBeInTheDocument();
    });

    it("muestra el helpText cuando no hay error", () => {
        render(
            <TextareaField label="Descripción" name="description" helpText="Positivo" />
        );
        expect(screen.getByText("Positivo")).toBeInTheDocument();
    });
});