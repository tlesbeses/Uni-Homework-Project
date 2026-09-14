import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
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
        mockMedia(true);
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

    it("muestra el selector de registros por página y cambia el tamaño", async () => {
        const manyUsers = Array.from({ length: 30 }, (_, index) => ({
            id: 100 + index,
            username: `usuario${index}`,
            first_name: "Usuario",
            last_name: `${index + 1}`,
            email: "",
            roles: ["Student"],
            is_superuser: false,
            is_active: true,
            date_joined: "2026-01-01T00:00:00Z",
        }));
        adminServiceMock.getAdminUsers.mockResolvedValue({
            results: manyUsers.slice(0, 9),
            count: 30,
            next: null,
        });

        renderPage();

        expect(await screen.findByText("30 usuarios")).toBeInTheDocument();
        const select = screen.getByLabelText("Registros por página");
        fireEvent.change(select, { target: { value: "25" } });
        expect(adminServiceMock.getAdminUsers).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, page_size: 25 })
        );
    });

    it("en móvil renderiza cards con acciones plegables que se colapsan al perder el foco", async () => {
        mockMedia(false);
        renderPage();

        expect(await screen.findByText("Ana Pez")).toBeInTheDocument();
        expect(screen.queryByRole("table")).not.toBeInTheDocument();

        const cards = screen.getAllByRole("listitem");
        expect(cards).toHaveLength(3);
        const anaCard = cards.find((card) =>
            within(card).queryByText("Ana Pez")
        );
        expect(within(anaCard).getByText("@ana")).toBeInTheDocument();

        const toggle = within(anaCard).getByRole("button", {
            name: "Ver acciones",
        });
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(toggle).toHaveAttribute("aria-controls");
        expect(within(anaCard).queryByText("Activar")).not.toBeInTheDocument();
        expect(
            within(anaCard).queryByText("Hacer profesor")
        ).not.toBeInTheDocument();

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(within(anaCard).getByText("Activar")).toBeVisible();
        expect(
            within(anaCard).getByText("Hacer profesor")
        ).toBeVisible();
        expect(within(anaCard).getByText("Probar como")).toBeVisible();
        expect(
            screen.queryByRole("button", { name: /Acciones de/ })
        ).not.toBeInTheDocument();

        fireEvent.focusOut(toggle, { relatedTarget: document.body });
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(
            within(anaCard).queryByText("Activar")
        ).not.toBeInTheDocument();
    });

    it("impersona al hacer clic en la fila de un usuario no superusuario (desktop)", async () => {
        mockMedia(true);
        renderPage();

        const anaRow = (await screen.findByText("Ana Pez")).closest("tr");
        fireEvent.click(anaRow);
        expect(authMock.startImpersonation).toHaveBeenCalledTimes(1);
        expect(authMock.startImpersonation).toHaveBeenCalledWith(
            expect.objectContaining({ id: 3, username: "ana" })
        );
    });

    it("no impersona al hacer clic en la fila de un superusuario (desktop)", async () => {
        mockMedia(true);
        renderPage();

        const rootRow = (await screen.findByText("Root Admin")).closest("tr");
        fireEvent.click(rootRow);
        expect(authMock.startImpersonation).not.toHaveBeenCalled();
    });

    it("no impersona por duplicado al pulsar el botón interno 'Probar como' (desktop)", async () => {
        mockMedia(true);
        renderPage();

        const perRow = (await screen.findByText("Per Profesor")).closest("tr");
        const impersonateBtn = within(perRow).getByRole("button", {
            name: "Probar como",
        });
        fireEvent.click(impersonateBtn);
        expect(authMock.startImpersonation).toHaveBeenCalledTimes(1);
    });

    it("impersona al hacer clic en la card (móvil)", async () => {
        mockMedia(false);
        renderPage();

        const anaCard = (await screen.findByText("Ana Pez")).closest("li");
        fireEvent.click(anaCard);
        expect(authMock.startImpersonation).toHaveBeenCalledTimes(1);
        expect(authMock.startImpersonation).toHaveBeenCalledWith(
            expect.objectContaining({ id: 3, username: "ana" })
        );
    });

    it("no impersona al pulsar el toggle de acciones (móvil)", async () => {
        mockMedia(false);
        renderPage();

        const anaCard = (await screen.findByText("Ana Pez")).closest("li");
        const toggle = within(anaCard).getByRole("button", {
            name: "Ver acciones",
        });
        fireEvent.click(toggle);
        expect(authMock.startImpersonation).not.toHaveBeenCalled();
        expect(toggle).toHaveAttribute("aria-expanded", "true");
    });

    it("no impersona al pulsar la card de un superusuario (móvil)", async () => {
        mockMedia(false);
        renderPage();

        const rootCard = (await screen.findByText("Root Admin")).closest("li");
        fireEvent.click(rootCard);
        expect(authMock.startImpersonation).not.toHaveBeenCalled();
    });
});