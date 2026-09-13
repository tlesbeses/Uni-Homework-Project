import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SnapshotsPage } from "@/features/snapshots/pages/SnapshotsPage";

const { snapshotsMock } = vi.hoisted(() => ({
    snapshotsMock: {
        snapshots: [],
        count: 0,
        totalPages: 1,
        loading: false,
        error: "",
        page: 1,
        setPage: vi.fn(),
        pageSize: 9,
        handlePageSizeChange: vi.fn(),
    },
}));

vi.mock("@/features/snapshots/hooks/useSnapshots", () => ({
    useSnapshots: () => snapshotsMock,
}));

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

function renderPage() {
    return render(
        <MemoryRouter>
            <SnapshotsPage />
        </MemoryRouter>
    );
}

describe("SnapshotsPage", () => {
    beforeEach(() => {
        mockMedia(false);
        snapshotsMock.snapshots = [];
        snapshotsMock.count = 0;
        snapshotsMock.loading = false;
        snapshotsMock.error = "";
    });

    it("en desktop muestra la tabla con los encabezados en orden correcto", () => {
        mockMedia(true);
        snapshotsMock.snapshots = [
            {
                id: 10,
                course_title: "Álgebra",
                section_name: "P1",
                teacher_name: "Per Profesor",
                reason: "course_delete",
                stats: null,
                created_at: "2026-08-01T10:00:00Z",
            },
        ];
        snapshotsMock.count = 1;

        renderPage();

        expect(
            screen.getByRole("table", { name: "Grupos borrados" })
        ).toBeInTheDocument();
        const headers = screen
            .getAllByRole("columnheader")
            .map((th) => th.textContent.trim());
        expect(headers).toEqual([
            "Curso",
            "Grupo",
            "Profesor",
            "Motivo",
            "Datos",
            "Fecha",
            "Acciones",
        ]);
        expect(screen.getByText("Álgebra")).toBeInTheDocument();
        expect(screen.getByText("P1")).toBeInTheDocument();
        expect(screen.getByText("Per Profesor")).toBeInTheDocument();
        expect(screen.getByText("Curso borrado")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Ver" })).toHaveAttribute(
            "href",
            "/snapshots/10"
        );
    });

    it("en móvil renderiza cards con primary, secondary, optional y acción Ver", () => {
        snapshotsMock.snapshots = [
            {
                id: 10,
                course_title: "Álgebra",
                section_name: "P1",
                teacher_name: "Per Profesor",
                reason: "course_delete",
                stats: {
                    approved_students: 4,
                    teams: 2,
                    assignments: 3,
                },
                created_at: "2026-08-01T10:00:00Z",
            },
        ];
        snapshotsMock.count = 1;

        renderPage();

        expect(screen.queryByRole("table")).not.toBeInTheDocument();
        const cards = screen.getAllByRole("listitem");
        expect(cards).toHaveLength(1);
        const card = cards[0];

        expect(within(card).getByText("Álgebra")).toBeInTheDocument();
        expect(within(card).getByText("P1")).toBeInTheDocument();
        expect(within(card).getByText("Per Profesor")).toBeInTheDocument();
        expect(within(card).getByText("Curso borrado")).toBeInTheDocument();

        const toggle = within(card).getByRole("button", {
            name: /Ver detalles/,
        });
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(
            within(card).queryByText(/alumnos ·/)
        ).not.toBeInTheDocument();

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(
            within(card).getByText("4 alumnos · 2 equipos · 3 tareas")
        ).toBeInTheDocument();

        expect(within(card).getByRole("link", { name: "Ver" })).toHaveAttribute(
            "href",
            "/snapshots/10"
        );
    });

    it("muestra estado vacío cuando no hay snapshots", () => {
        renderPage();

        expect(
            screen.getByText("No hay grupos borrados para mostrar.")
        ).toBeInTheDocument();
    });

    it("muestra error de carga si la query falla", () => {
        snapshotsMock.error = "Error al cargar";

        renderPage();

        expect(screen.getByText("Error al cargar")).toBeInTheDocument();
    });
});
