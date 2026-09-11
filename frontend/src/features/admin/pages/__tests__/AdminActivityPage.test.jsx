import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminActivityPage } from "@/features/admin/pages/AdminActivityPage";

const { activityMock } = vi.hoisted(() => ({
    activityMock: {
        logs: [],
        count: 0,
        loading: false,
        error: "",
        page: 1,
        setPage: vi.fn(),
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

    it("muestra la tarjeta de accesos con logins y usuarios unicos por dia", () => {
        loginStatsMock.stats = {
            days: 7,
            totals: { logins: 4, unique_users: 3 },
            per_day: [
                { date: "2026-09-10", logins: 2, unique_users: 1 },
                { date: "2026-09-09", logins: 2, unique_users: 2 },
            ],
        };

        renderPage();

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

        expect(
            screen.getByText("Cargando métricas de acceso...")
        ).toBeInTheDocument();
    });

    it("muestra un error si fallan las metricas de acceso", () => {
        loginStatsMock.error = "Error de red";

        renderPage();

        expect(
            screen.getByText(/No se pudieron cargar las métricas/)
        ).toBeInTheDocument();
    });
});