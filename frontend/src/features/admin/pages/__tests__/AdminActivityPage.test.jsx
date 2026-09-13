import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminActivityPage } from "@/features/admin/pages/AdminActivityPage";

const { activityMock } = vi.hoisted(() => ({
    activityMock: {
        logs: [],
        count: 0,
        loading: false,
        error: "",
        page: 1,
        totalPages: 1,
        pageSize: 15,
        setPage: vi.fn(),
        handlePageSizeChange: vi.fn(),
        reload: vi.fn(),
    },
}));

const { loginStatsMock } = vi.hoisted(() => ({
    loginStatsMock: {
        stats: null,
        loading: false,
        error: "",
        reload: vi.fn(),
    },
}));

vi.mock("@/features/admin/hooks/useActivityLogs", () => ({
    useActivityLogs: () => activityMock,
}));

vi.mock("@/features/admin/hooks/useLoginStats", () => ({
    useLoginStats: () => loginStatsMock,
}));

function renderPage() {
    return render(
        <MemoryRouter>
            <AdminActivityPage />
        </MemoryRouter>
    );
}

function goToLogins() {
    fireEvent.click(screen.getByRole("button", { name: "Accesos" }));
}

describe("AdminActivityPage", () => {
    beforeEach(() => {
        activityMock.logs = [];
        activityMock.count = 0;
        activityMock.loading = false;
        activityMock.error = "";
        loginStatsMock.stats = null;
        loginStatsMock.loading = false;
        loginStatsMock.error = "";
    });

    it("muestra la tarjeta de accesos con logins y usuarios unicos por dia en la pestana Accesos", () => {
        loginStatsMock.stats = {
            days: 7,
            totals: { logins: 4, unique_users: 3 },
            per_day: [
                { date: "2026-09-10", logins: 2, unique_users: 1 },
                { date: "2026-09-09", logins: 2, unique_users: 2 },
            ],
        };

        renderPage();
        goToLogins();

        expect(
            screen.getByText("Accesos (últimos 7 días)")
        ).toBeInTheDocument();
        expect(screen.getByText("Logins totales")).toBeInTheDocument();
        expect(screen.getByText("4")).toBeInTheDocument();
        expect(
            screen.getByText("Usuarios únicos que entraron")
        ).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByText("Día")).toBeInTheDocument();
    });

    it("muestra estado de carga mientras se obtienen las metricas", () => {
        loginStatsMock.loading = true;

        renderPage();
        goToLogins();

        expect(
            screen.getByText("Cargando métricas de acceso...")
        ).toBeInTheDocument();
    });

    it("muestra un error si fallan las metricas de acceso", () => {
        loginStatsMock.error = "Error de red";

        renderPage();
        goToLogins();

        expect(
            screen.getByText(/No se pudieron cargar las métricas/)
        ).toBeInTheDocument();
    });

    it("la pestana Actividad por defecto no ofrece 'Inicio de sesión' como filtro", () => {
        renderPage();

        expect(
            screen.getByLabelText("Filtrar por acción")
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("option", { name: "Inicio de sesión" })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText(/Logins totales/)
        ).not.toBeInTheDocument();
    });

    it("muestra la tabla de accesos registrados en la pestana Accesos", () => {
        activityMock.logs = [
            {
                id: 1,
                action: "login",
                entity_type: "user",
                actor: {
                    username: "ana",
                    first_name: "Ana",
                    last_name: "Pez",
                },
                target: {
                    username: "ana",
                    first_name: "Ana",
                    last_name: "Pez",
                },
                metadata: { roles: ["Student"] },
                created_at: "2026-09-12T10:00:00Z",
            },
        ];
        activityMock.count = 1;

        renderPage();
        goToLogins();

        expect(screen.getByText("Ana Pez")).toBeInTheDocument();
        expect(screen.getByText("@ana")).toBeInTheDocument();
        expect(screen.getByText("Estudiante")).toBeInTheDocument();
    });

    it("muestra el selector de registros por página cuando hay varias páginas", () => {
        activityMock.count = 40;
        activityMock.totalPages = 3;

        renderPage();

        expect(screen.getByText("40 registros")).toBeInTheDocument();
        expect(
            screen.getByLabelText("Registros por página")
        ).toBeInTheDocument();
        expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
    });

    it("en móvil muestra la actividad como cards con el detalle plegable", () => {
        activityMock.logs = [
            {
                id: 5,
                action: "create",
                entity_type: "course",
                actor: {
                    username: "pep",
                    first_name: "Pepe",
                    last_name: "Grillo",
                },
                target: {
                    username: "ana",
                    first_name: "Ana",
                    last_name: "Pez",
                },
                metadata: { title: "Álgebra", visibility: "PUBLIC" },
                created_at: "2026-09-12T10:00:00Z",
            },
        ];
        activityMock.count = 1;

        renderPage();

        const card = screen.getAllByRole("listitem")[0];
        expect(within(card).getByText("Creación")).toBeInTheDocument();
        expect(within(card).getByText("Pepe Grillo")).toBeInTheDocument();
        expect(within(card).getByText("Curso")).toBeInTheDocument();
        expect(within(card).getByText("Ana Pez")).toBeInTheDocument();

        const toggle = within(card).getByRole("button", {
            name: /Ver detalles/,
        });
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(
            within(card).queryByText(/Título: Álgebra/)
        ).not.toBeInTheDocument();

        fireEvent.click(toggle);
        expect(
            within(card).getByText("Título: Álgebra")
        ).toBeInTheDocument();
        expect(
            within(card).getByText("Visibilidad: Público")
        ).toBeInTheDocument();
    });

    it("en móvil muestra los accesos como cards con los roles", () => {
        activityMock.logs = [
            {
                id: 1,
                action: "login",
                entity_type: "user",
                actor: {
                    username: "ana",
                    first_name: "Ana",
                    last_name: "Pez",
                },
                target: null,
                metadata: { roles: ["Student", "Admin"] },
                created_at: "2026-09-12T10:00:00Z",
            },
        ];
        activityMock.count = 1;

        renderPage();
        goToLogins();

        const card = screen.getAllByRole("listitem")[0];
        expect(within(card).getByText("Ana Pez")).toBeInTheDocument();
        expect(within(card).getByText("@ana")).toBeInTheDocument();
        expect(within(card).getByText("Estudiante")).toBeInTheDocument();
        expect(within(card).getByText("Administrador")).toBeInTheDocument();
    });
});