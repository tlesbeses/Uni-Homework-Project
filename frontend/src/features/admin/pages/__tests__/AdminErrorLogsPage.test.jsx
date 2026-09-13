import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminErrorLogsPage } from "@/features/admin/pages/AdminErrorLogsPage";

const { adminServiceMock } = vi.hoisted(() => ({
    adminServiceMock: {
        getErrorLogs: vi.fn(),
    },
}));

vi.mock("@/features/admin/services/adminService", () => adminServiceMock);

function mockMedia(matches) {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

const mockLogsResponse = {
    results: [
        {
            id: 1,
            error_id: "ERR-001",
            source: "server",
            kind: "ValueError",
            message: "Migration state corrupto",
            path: "/api/classrooms/1",
            user_id: 42,
            created_at: "2026-09-01T10:00:00Z",
        },
        {
            id: 2,
            error_id: "ERR-002",
            source: "client",
            kind: "TypeError",
            message: "Cannot read properties of undefined",
            path: "/login",
            user_id: null,
            created_at: "2026-09-02T11:00:00Z",
        },
    ],
    count: 2,
    next: null,
};

function renderPage() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <AdminErrorLogsPage />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

describe("AdminErrorLogsPage", () => {
    beforeEach(() => {
        adminServiceMock.getErrorLogs.mockReset();
        adminServiceMock.getErrorLogs.mockResolvedValue(mockLogsResponse);
    });

    it("en desktop renderiza la tabla tradicional con todas las columnas", async () => {
        mockMedia(true);
        renderPage();

        const table = await screen.findByRole("table");
        const headers = within(table).getAllByRole("columnheader");
        expect(headers.map((h) => h.textContent)).toEqual([
            "Código",
            "Fuente",
            "Tipo",
            "Mensaje",
            "Ruta",
            "Usuario",
            "Fecha",
        ]);
        expect(
            await within(table).findByRole("link", { name: "ERR-001" })
        ).toHaveAttribute("href", "/admin/errors/1");
        expect(within(table).getByText("Servidor")).toBeInTheDocument();
        expect(within(table).getByText("/api/classrooms/1")).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Ver detalle" })
        ).not.toBeInTheDocument();
    });

    it("en móvil renderiza cards y no la tabla", async () => {
        mockMedia(false);
        renderPage();

        expect(await screen.findByText("ERR-001")).toBeInTheDocument();
        expect(screen.queryByRole("table")).not.toBeInTheDocument();

        const cards = screen.getAllByRole("listitem");
        expect(cards).toHaveLength(2);
        expect(within(cards[0]).getByText("Servidor")).toBeInTheDocument();
        expect(
            within(cards[0]).getByRole("link", { name: "Ver detalle" })
        ).toHaveAttribute("href", "/admin/errors/1");
    });

    it("en móvil 'Ver detalles' expande los campos opcionales", async () => {
        mockMedia(false);
        renderPage();

        await screen.findByText("ERR-001");
        const toggle = screen.getAllByRole("button", { name: "Ver detalles" })[0];
        expect(toggle).toHaveAttribute("aria-expanded", "false");

        fireEvent.click(toggle);

        expect(toggle).toHaveAttribute("aria-expanded", "true");
        const ruta = screen.getByText("/api/classrooms/1");
        expect(ruta).toBeVisible();
        expect(screen.getByText("42")).toBeVisible();
    });

    it("muestra el estado vacío cuando no hay registros", async () => {
        mockMedia(true);
        adminServiceMock.getErrorLogs.mockResolvedValue({
            results: [],
            count: 0,
            next: null,
        });

        renderPage();

        expect(
            await screen.findByText("No se encontraron errores registrados.")
        ).toBeInTheDocument();
    });
});