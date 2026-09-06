import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SelectField } from "@/shared/components/ui/SelectField";

describe("SelectField", () => {
    it("renderiza label y las opciones", () => {
        render(
            <SelectField label="Visibilidad" name="visibility">
                <option value="PRIVATE">Privado</option>
                <option value="PUBLIC">Público</option>
            </SelectField>
        );
        expect(screen.getByLabelText("Visibilidad")).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Privado" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Público" })).toBeInTheDocument();
    });

    it("propaga los props de react-hook-form register al select", () => {
        const register = vi.fn((name) => ({ name, onChange: vi.fn(), ref: vi.fn() }));
        render(
            <SelectField label="Visibilidad" name="visibility" register={register}>
                <option value="PRIVATE">Privado</option>
            </SelectField>
        );
        expect(register).toHaveBeenCalledWith("visibility");
        expect(screen.getByRole("combobox")).toHaveAttribute("name", "visibility");
    });

    it("permite uso controlado con value/onChange", () => {
        const onChange = vi.fn();
        render(
            <SelectField value="PRIVATE" onChange={onChange}>
                <option value="PRIVATE">Privado</option>
            </SelectField>
        );
        expect(screen.getByRole("combobox")).toHaveValue("PRIVATE");
    });

    it("muestra el error y oculta el helpText", () => {
        render(
            <SelectField
                label="Visibilidad"
                name="visibility"
                error="Campo requerido"
                helpText="Ayuda"
            >
                <option value="PRIVATE">Privado</option>
            </SelectField>
        );
        expect(screen.getByText("Campo requerido")).toBeInTheDocument();
        expect(screen.queryByText("Ayuda")).not.toBeInTheDocument();
    });

    it("muestra el helpText cuando no hay error", () => {
        render(
            <SelectField label="Visibilidad" name="visibility" helpText="Ayuda">
                <option value="PRIVATE">Privado</option>
            </SelectField>
        );
        expect(screen.getByText("Ayuda")).toBeInTheDocument();
    });
});