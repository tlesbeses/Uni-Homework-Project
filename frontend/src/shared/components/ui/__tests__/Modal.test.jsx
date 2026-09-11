import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Modal } from "@/shared/components/ui/Modal";

describe("Modal", () => {
    it("no renderiza nada cuando está cerrado", () => {
        const { container } = render(
            <Modal open={false} title="Título">
                <p>contenido</p>
            </Modal>
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("renderiza título, contenido y rol dialog", () => {
        render(
            <Modal open title="Nueva tarea" onClose={vi.fn()}>
                <p>contenido del diálogo</p>
            </Modal>
        );
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Nueva tarea" })).toBeInTheDocument();
        expect(screen.getByText("contenido del diálogo")).toBeInTheDocument();
    });

    it("cierra con el botón ×", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(
            <Modal open title="Nueva tarea" onClose={onClose}>
                <p>contenido</p>
            </Modal>
        );
        await user.click(screen.getByRole("button", { name: "Cerrar" }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("cierra con la tecla Escape", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(
            <Modal open onClose={onClose}>
                <p>contenido</p>
            </Modal>
        );
        await user.keyboard("{Escape}");
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("cierra al hacer clic en el fondo oscuro", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(
            <Modal open onClose={onClose}>
                <p>contenido</p>
            </Modal>
        );
        await user.click(screen.getByRole("dialog").parentElement);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("no cierra con el fondo ni con Escape cuando no hay onClose", async () => {
        const user = userEvent.setup();
        render(
            <Modal open>
                <p>contenido</p>
            </Modal>
        );
        await user.keyboard("{Escape}");
        await user.click(screen.getByRole("dialog").parentElement);
        expect(screen.getByText("contenido")).toBeInTheDocument();
    });

    it("no muestra botón de cerrar cuando no hay onClose", () => {
        render(
            <Modal open title="Título">
                <p>contenido</p>
            </Modal>
        );
        expect(screen.queryByRole("button", { name: "Cerrar" })).not.toBeInTheDocument();
    });

    it("asocia el título al diálogo con aria-labelledby", () => {
        render(
            <Modal open title="Nueva tarea" onClose={vi.fn()}>
                <p>contenido</p>
            </Modal>
        );
        const dialog = screen.getByRole("dialog");
        const heading = screen.getByRole("heading", { name: "Nueva tarea" });
        expect(dialog).toHaveAttribute("aria-labelledby", heading.id);
    });

    it("atrapa el foco dentro del diálogo al presionar Tab", () => {
        render(
            <Modal open title="Nueva tarea" onClose={vi.fn()}>
                <button type="button">Primero</button>
                <button type="button">Segundo</button>
            </Modal>
        );
        const dialog = screen.getByRole("dialog");
        const buttons = within(dialog).getAllByRole("button");
        const firstPanelButton = buttons[0];
        const lastPanelButton = buttons[buttons.length - 1];

        lastPanelButton.focus();
        fireEvent.keyDown(document.activeElement, { key: "Tab" });
        expect(firstPanelButton).toHaveFocus();

        firstPanelButton.focus();
        fireEvent.keyDown(document.activeElement, { key: "Tab", shiftKey: true });
        expect(lastPanelButton).toHaveFocus();
    });

    it("restaura el foco al elemento que abrió el diálogo al cerrar", async () => {
        const user = userEvent.setup();
        function Harness() {
            const [open, setOpen] = useState(false);
            return (
                <>
                    <button type="button" onClick={() => setOpen(true)}>
                        Abrir
                    </button>
                    <Modal open={open} title="Titulo" onClose={() => setOpen(false)}>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                        >
                            Terminar
                        </button>
                    </Modal>
                </>
            );
        }
        render(<Harness />);
        await user.click(screen.getByRole("button", { name: "Abrir" }));
        await user.click(screen.getByRole("button", { name: "Terminar" }));
        expect(screen.getByRole("button", { name: "Abrir" })).toHaveFocus();
    });
});