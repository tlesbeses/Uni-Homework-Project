import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminUsersPage } from "@/features/admin/pages/AdminUsersPage";

const { adminServiceMock } = vi.hoisted(() => ({
    adminServiceMock: {
        getAdminUsers: vi.fn(),
        setUserActive: vi.fn(),
        setUserRole: vi.fn(),
    },
}));

const { authMock } = vi.hoisted(() => ({
    authMock: {
        user: {
            id: 99,
            username: "root-admin",
            first_name: "Súper",
            last_name: "Admin",
            roles: [],
        },
        startImpersonation: vi.fn(),
    },
}));

const { toastMock } = vi.hoisted(() => ({
    toastMock: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("react-toastify", () => ({ toast: toastMock }));
vi.mock("@/features/auth/providers/AuthProvider", () => ({
    useAuth: () => authMock,
}));
vi.mock("@/features/admin/services/adminService", () => adminServiceMock);

// La respuesta del endpoint /auth/admin/users/ es paginada ({results, count}):
// el hook debe aplanarla, o la página revienta con "users is not iterable".
const mockPaginatedResponse = {
    results: [
        {
            id: 3,
            username: "ana",
            first_name: "Ana",
            last_name: "Pez",
            email: "ana@example.com",
            roles: ["Student"],
            is_superuser: false,
            is_active: false,
            date_joined: "2026-01-01T00:00:00Z",
        },
        {
            id: 1,
            username: "root",
            first_name: "Root",
            last_name: "Admin",
            email: "root@example.com",
            roles: [],
            is_superuser: true,
            is_active: true,
            date_joined: "2025-01-01T00:00:00Z",
        },
        {
            id: 2,
            username: "per",
            first_name: "Per",
            last_name: "Profesor",
            email: "per@example.com",
            roles: ["Teacher"],
            is_superuser: false,
            is_active: true,
            date_joined: "2025-06-01T00:00:00Z",
        },
    ],
    count: 3,
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
                <AdminUsersPage />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

describe("AdminUsersPage", () => {
    beforeEach(() => {
        adminServiceMock.getAdminUsers.mockReset();
        adminServiceMock.setUserActive.mockReset();
        adminServiceMock.setUserRole.mockReset();
        toastMock.success.mockReset();
        toastMock.error.mockReset();
        authMock.startImpersonation.mockReset();
        adminServiceMock.getAdminUsers.mockResolvedValue(mockPaginatedResponse);
    });

    it("renderiza todos los usuarios de una respuesta paginada y ordena los superusuarios primero", async () => {
        renderPage();

        expect(await screen.findByText("Root Admin")).toBeInTheDocument();
        expect(screen.getByText("Ana Pez")).toBeInTheDocument();
        expect(screen.getByText("Per Profesor")).toBeInTheDocument();
        expect(screen.getByText("Superusuario")).toBeInTheDocument();
        expect(screen.getByText("Profesor")).toBeInTheDocument();
        expect(screen.getByText("Estudiante")).toBeInTheDocument();

        const rows = screen.getAllByRole("row");
        expect(rows[1]).toHaveTextContent("Root Admin");
    });

    it("muestra el estado vacío cuando no hay usuarios", async () => {
        adminServiceMock.getAdminUsers.mockResolvedValue({
            results: [],
            count: 0,
            next: null,
        });

        renderPage();

        expect(
            await screen.findByText("No se encontraron usuarios.")
        ).toBeInTheDocument();
    });
});