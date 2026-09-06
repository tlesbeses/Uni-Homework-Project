import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
});