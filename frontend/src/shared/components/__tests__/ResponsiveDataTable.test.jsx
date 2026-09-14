import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ResponsiveDataTable } from "@/shared/components/ResponsiveDataTable";

function mockViewport(isDesktop) {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: isDesktop,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

const columns = [
    { key: "name", header: "Nombre", role: "primary", render: (row) => row.name },
];

function rows(count) {
    return Array.from({ length: count }, (_, i) => ({ id: i, name: `Fila ${i + 1}` }));
}

function renderTable(count) {
    return render(
        <ResponsiveDataTable
            columns={columns}
            rows={rows(count)}
            rowKey={(row) => row.id}
            ariaLabel="Lista de prueba"
        />
    );
}

beforeEach(() => {
    mockViewport(false);
});

describe("ResponsiveDataTable", () => {
    it("no muestra el paginador con pocas filas", () => {
        renderTable(1);

        expect(screen.queryByLabelText("Paginación")).not.toBeInTheDocument();
        expect(screen.getAllByRole("listitem")).toHaveLength(1);
        expect(screen.getByText("Fila 1")).toBeInTheDocument();
    });

    it("muestra el paginador y solo la primera página cuando hay más filas", () => {
        renderTable(12);

        const nav = screen.getByLabelText("Paginación");
        expect(nav).toBeInTheDocument();
        expect(within(nav).getByText("Página 1 de 2")).toBeInTheDocument();
        expect(screen.getAllByRole("listitem")).toHaveLength(10);
        expect(screen.getByText("Fila 1")).toBeInTheDocument();
        expect(screen.queryByText("Fila 11")).not.toBeInTheDocument();
    });

    it("navega entre páginas y deshabilita en los extremos", () => {
        renderTable(12);

        const nav = screen.getByLabelText("Paginación");
        const previous = within(nav).getByText("« Anterior").closest("button");
        const next = within(nav).getByText("Siguiente »").closest("button");

        expect(previous).toBeDisabled();
        expect(next).not.toBeDisabled();

        fireEvent.click(next);

        expect(within(nav).getByText("Página 2 de 2")).toBeInTheDocument();
        expect(screen.getByText("Fila 11")).toBeInTheDocument();
        expect(screen.queryByText("Fila 1")).not.toBeInTheDocument();
        expect(previous).not.toBeDisabled();
        expect(next).toBeDisabled();

        fireEvent.click(previous);
        expect(within(nav).getByText("Página 1 de 2")).toBeInTheDocument();
    });

    it("sujeta la página al rango válido cuando se reducen las filas", () => {
        const { rerender } = renderTable(22);

        fireEvent.click(screen.getByText("Siguiente »"));
        fireEvent.click(screen.getByText("Siguiente »"));
        expect(screen.getByText("Página 3 de 3")).toBeInTheDocument();

        rerender(
            <ResponsiveDataTable
                columns={columns}
                rows={rows(12)}
                rowKey={(row) => row.id}
                ariaLabel="Lista de prueba"
            />
        );

        expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
        expect(screen.getByText("Fila 11")).toBeInTheDocument();
    });

    it("en desktop no muestra el paginador y renderiza todas las filas", () => {
        mockViewport(true);
        renderTable(12);

        expect(screen.queryByLabelText("Paginación")).not.toBeInTheDocument();
        expect(screen.getAllByRole("row")).toHaveLength(13);
        expect(screen.getByText("Fila 12")).toBeInTheDocument();
    });

    it("limita las filas secundarias visibles y mantiene las ancladas", () => {
        const secondary = Array.from({ length: 6 }, (_, i) => ({
            key: `a${i}`,
            header: `Asignación ${i + 1}`,
            role: "secondary",
            render: () => `nota ${i + 1}`,
        }));
        render(
            <ResponsiveDataTable
                columns={[
                    {
                        key: "name",
                        header: "Nombre",
                        role: "primary",
                        render: (row) => row.name,
                    },
                    {
                        key: "total",
                        header: "Total",
                        role: "secondary",
                        pinnedSecondary: true,
                        render: (row) => row.total,
                    },
                    ...secondary,
                ]}
                rows={[{ id: 1, name: "Fila 1", total: 90 }]}
                rowKey={(row) => row.id}
                ariaLabel="Lista de prueba"
                visibleSecondary={4}
            />
        );

        expect(screen.getByText("Asignación 1")).toBeInTheDocument();
        expect(screen.getByText("Asignación 4")).toBeInTheDocument();
        expect(screen.queryByText("Asignación 5")).not.toBeInTheDocument();
        expect(screen.getByText("Total")).toBeInTheDocument();
        expect(screen.getByText("90")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /Ver más/ }));

        expect(screen.getByText("Asignación 5")).toBeInTheDocument();
        expect(screen.getByText("Asignación 6")).toBeInTheDocument();
        expect(screen.getByText("Total")).toBeInTheDocument();
    });

    it("muestra el contenido vacío sin filas", () => {
        renderTable(0);

        expect(screen.getByText("No hay datos.")).toBeInTheDocument();
        expect(screen.queryByLabelText("Paginación")).not.toBeInTheDocument();
    });
});