import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "@/app/pages/DashboardPage";

const { toastMock } = vi.hoisted(() => ({
    toastMock: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

const { authMock } = vi.hoisted(() => ({
    authMock: {
        user: {
            id: 1,
            username: "root",
            first_name: "Root",
            last_name: "Admin",
            roles: [],
        },
        isTeacher: false,
        isStudent: false,
        isAdmin: true,
        startImpersonation: vi.fn(),
    },
}));

const { dashboardMock } = vi.hoisted(() => ({
    dashboardMock: {
        stats: null,
        loading: false,
    },
}));

vi.mock("react-toastify", () => ({ toast: toastMock }));
vi.mock("@/features/auth/providers/AuthProvider", () => ({
    useAuth: () => authMock,
}));
vi.mock("@/features/courses/hooks/useDashboard", () => ({
    useDashboard: () => dashboardMock,
}));

const adminStats = {
    type: "admin",
    stats: {
        users_total: 10,
        teachers: 2,
        students: 5,
        courses: 3,
        pending_enrollments: 1,
        users_active: 8,
    },
    recent_users: [],
    recent_impersonations: [
        {
            id: 101,
            timestamp: "2026-09-05T10:00:00Z",
            admin: {
                id: 1,
                username: "root",
                first_name: "Root",
                last_name: "Admin",
            },
            target: {
                id: 7,
                username: "ainara",
                first_name: "Ainara",
                last_name: "Pez",
                roles: ["Student"],
                is_active: true,
            },
        },
    ],
    recent_activity: [],
    recent_courses: [],
};

function renderPage() {
    return render(
        <MemoryRouter>
            <DashboardPage />
        </MemoryRouter>
    );
}

beforeEach(() => {
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    authMock.startImpersonation.mockReset();
    authMock.startImpersonation.mockResolvedValue(true);
    dashboardMock.stats = adminStats;
    dashboardMock.loading = false;
});

describe("DashboardPage — impersonar desde el registro reciente", () => {
    it("muestra las filas de impersonados recientes clicables", () => {
        renderPage();

        const row = screen.getByRole("button", { name: /Ainara Pez/ });
        expect(row).toBeInTheDocument();
        expect(
            within(row).getByText("Probar como")
        ).toBeInTheDocument();
    });

    it("al hacer clic en la fila abre el modal de confirmación", () => {
        renderPage();

        fireEvent.click(
            screen.getByRole("button", { name: /Ainara Pez/ })
        );

        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
        expect(
            within(dialog).getByRole("button", { name: "Probar como" })
        ).toBeInTheDocument();
    });

    it("confirmar impersona al usuario y avisa", async () => {
        renderPage();

        fireEvent.click(
            screen.getByRole("button", { name: /Ainara Pez/ })
        );
        fireEvent.click(
            within(screen.getByRole("dialog")).getByRole("button", {
                name: "Probar como",
            })
        );

        await waitFor(() =>
            expect(authMock.startImpersonation).toHaveBeenCalledWith(
                expect.objectContaining({ id: 7 })
            )
        );
        expect(toastMock.success).toHaveBeenCalledWith(
            "Probando el sistema como Ainara Pez."
        );
    });

    it("cancelar cierra el modal sin impersonar", () => {
        renderPage();

        fireEvent.click(
            screen.getByRole("button", { name: /Ainara Pez/ })
        );
        fireEvent.click(
            screen.getByRole("button", { name: "Cancelar" })
        );

        expect(authMock.startImpersonation).not.toHaveBeenCalled();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
});