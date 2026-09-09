import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickSettingsBar } from "@/features/courses/components/QuickSettingsBar";

const baseCourse = {
    id: 2,
    visibility: "PUBLIC",
    settings: {
        auto_accept_students: false,
        ponderacion_enabled: false,
        p1_acumulado_pct: "25.00",
        p1_examen_pct: "25.00",
        p2_acumulado_pct: "25.00",
        p2_examen_pct: "25.00",
    },
};

function renderBar(props = {}) {
    return render(
        <QuickSettingsBar
            course={{ ...baseCourse }}
            savingField={null}
            onToggleAutoAccept={vi.fn()}
            onToggleVisibility={vi.fn()}
            onUpdatePonderacion={vi.fn()}
            {...props}
        />
    );
}

function enablePonderacion() {
    fireEvent.click(
        screen.getByRole("switch", {
            name: "Activar ponderación de la nota final",
        })
    );
}

describe("QuickSettingsBar — ponderación", () => {
    it("oculta los inputs hasta activar la ponderación", () => {
        renderBar();
        expect(
            screen.queryAllByDisplayValue("25.00")
        ).toHaveLength(0);
        enablePonderacion();
        expect(
            screen.queryAllByDisplayValue("25.00")
        ).toHaveLength(4);
    });

    it("habilita Guardar con suma 100 y lo deshabilita si no cuadra", () => {
        renderBar();
        enablePonderacion();
        const save = () =>
            screen.getByRole("button", { name: "Guardar porcentajes" });
        expect(save()).toBeEnabled();

        const [first] = screen.getAllByDisplayValue("25.00");
        fireEvent.change(first, { target: { value: "50.00" } });
        expect(screen.getByText(/Debe sumar 100/)).toBeInTheDocument();
        expect(save()).toBeDisabled();

        fireEvent.change(first, { target: { value: "25.00" } });
        expect(screen.getByText(/los porcentajes cuadran/i)).toBeInTheDocument();
        expect(save()).toBeEnabled();
    });

    it("envía los cuatro porcentajes al guardar", () => {
        const onUpdatePonderacion = vi.fn();
        renderBar({ onUpdatePonderacion });
        enablePonderacion();
        const [first, second] = screen.getAllByDisplayValue("25.00");
        fireEvent.change(first, { target: { value: "10.00" } });
        fireEvent.change(second, { target: { value: "40.00" } });
        fireEvent.click(
            screen.getByRole("button", { name: "Guardar porcentajes" })
        );
        expect(onUpdatePonderacion).toHaveBeenLastCalledWith(
            expect.objectContaining({
                p1_acumulado_pct: "10.00",
                p1_examen_pct: "40.00",
                p2_acumulado_pct: "25.00",
                p2_examen_pct: "25.00",
            })
        );
    });

    it("reviértete al último valor válido al perder el foco con un valor fuera de rango", () => {
        renderBar();
        enablePonderacion();
        const [first, second] = screen.getAllByDisplayValue("25.00");
        fireEvent.change(first, { target: { value: "200" } });
        expect(first.value).toBe("200");
        fireEvent.blur(first, { relatedTarget: second });
        expect(first.value).toBe("25.00");
    });

    it("colapsa al salir de la tarjeta y se reabre al clicar la cabecera", () => {
        renderBar();
        enablePonderacion();
        expect(
            screen.queryAllByDisplayValue("25.00")
        ).toHaveLength(4);

        fireEvent.mouseDown(document.body);
        expect(
            screen.queryAllByDisplayValue("25.00")
        ).toHaveLength(0);

        fireEvent.click(screen.getByText("Ponderación de la nota final"));
        expect(
            screen.queryAllByDisplayValue("25.00")
        ).toHaveLength(4);
    });

    it("no colapsa al guardar dentro de la tarjeta", () => {
        renderBar();
        enablePonderacion();
        const save = screen.getByRole("button", {
            name: "Guardar porcentajes",
        });
        fireEvent.focus(screen.getAllByDisplayValue("25.00")[0]);
        fireEvent.blur(screen.getAllByDisplayValue("25.00")[1], {
            relatedTarget: save,
        });
        expect(
            screen.queryAllByDisplayValue("25.00")
        ).toHaveLength(4);
    });
});