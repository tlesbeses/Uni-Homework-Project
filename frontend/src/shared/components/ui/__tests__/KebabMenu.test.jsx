import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KebabMenu } from "@/shared/components/ui/KebabMenu";

const ITEMS = [
    { label: "Editar", onClick: vi.fn() },
    { label: "Eliminar", onClick: vi.fn(), className: "text-red-600" },
];

describe("KebabMenu", () => {
    it("expone botón con semántica de menú", async () => {
        render(<KebabMenu items={ITEMS} />);
        const button = screen.getByRole("button", { name: "Opciones" });
        expect(button).toHaveAttribute("aria-haspopup", "menu");
        expect(button).toHaveAttribute("aria-expanded", "false");
        await userEvent.click(button);
        expect(button).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("menu")).toBeInTheDocument();
        expect(screen.getAllByRole("menuitem")).toHaveLength(2);
    });

    it("navega entre ítems con flechas y cierra con Escape", async () => {
        const user = userEvent.setup();
        render(<KebabMenu items={ITEMS} />);
        await user.click(screen.getByRole("button", { name: "Opciones" }));
        const edit = screen.getByRole("menuitem", { name: "Editar" });
        const remove = screen.getByRole("menuitem", { name: "Eliminar" });
        expect(edit).toHaveFocus();
        await user.keyboard("{ArrowDown}");
        expect(remove).toHaveFocus();
        await user.keyboard("{ArrowUp}");
        expect(edit).toHaveFocus();
        await user.keyboard("{Escape}");
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Opciones" })).toHaveFocus();
    });

    it("ejecuta la acción del ítem y cierra el menú", async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(<KebabMenu items={[{ label: "Borrar", onClick }]} />);
        await user.click(screen.getByRole("button", { name: "Opciones" }));
        await user.click(screen.getByRole("menuitem", { name: "Borrar" }));
        expect(onClick).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
});