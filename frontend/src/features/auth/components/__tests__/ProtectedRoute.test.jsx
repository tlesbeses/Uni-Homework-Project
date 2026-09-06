import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock("@/features/auth/providers/AuthProvider", () => ({
    useAuth: (...args) => useAuthMock(...args),
}));

function renderProtected(props) {
    return render(
        <MemoryRouter initialEntries={["/protegida"]}>
            <Routes>
                <Route
                    path="/protegida"
                    element={
                        <ProtectedRoute {...props}>
                            <div>contenido protegido</div>
                        </ProtectedRoute>
                    }
                />
                <Route path="/login" element={<div>login page</div>} />
                <Route path="/403" element={<div>forbidden page</div>} />
            </Routes>
        </MemoryRouter>
    );
}

function authed(overrides = {}) {
    return {
        user: {
            id: 1,
            username: "ana",
            roles: ["Student"],
            permissions: [],
            is_superuser: false,
        },
        isLoading: false,
        isImpersonating: false,
        ...overrides,
    };
}

beforeEach(() => {
    useAuthMock.mockReset();
});

describe("ProtectedRoute", () => {
    it("muestra el loader mientras la sesión está cargando", () => {
        useAuthMock.mockReturnValue({
            user: null,
            isLoading: true,
            isImpersonating: false,
        });
        renderProtected();
        expect(screen.getByText("Cargando tu sesión...")).toBeInTheDocument();
    });

    it("redirige a /login cuando no hay usuario", () => {
        useAuthMock.mockReturnValue({
            user: null,
            isLoading: false,
            isImpersonating: false,
        });
        renderProtected();
        expect(screen.getByText("login page")).toBeInTheDocument();
    });

    it("renderiza los hijos con un usuario autenticado", () => {
        useAuthMock.mockReturnValue(authed());
        renderProtected();
        expect(screen.getByText("contenido protegido")).toBeInTheDocument();
    });

    it("superuserOnly bloquea a quien no es superusuario", () => {
        useAuthMock.mockReturnValue(authed());
        renderProtected({ superuserOnly: true });
        expect(screen.getByText("forbidden page")).toBeInTheDocument();
    });

    it("superuserOnly permite al superusuario", () => {
        useAuthMock.mockReturnValue(
            authed({
                user: { ...authed().user, is_superuser: true },
                isAdminPanelEnabled: true,
            })
        );
        renderProtected({ superuserOnly: true });
        expect(screen.getByText("contenido protegido")).toBeInTheDocument();
    });

    it("superuserOnly bloquea al superusuario si el panel está deshabilitado", () => {
        useAuthMock.mockReturnValue(
            authed({
                user: { ...authed().user, is_superuser: true },
                isAdminPanelEnabled: false,
            })
        );
        renderProtected({ superuserOnly: true });
        expect(screen.getByText("forbidden page")).toBeInTheDocument();
    });

    it("blockSuperuser bloquea al superusuario fuera de impersonación", () => {
        useAuthMock.mockReturnValue(
            authed({
                user: { ...authed().user, is_superuser: true },
                isImpersonating: false,
            })
        );
        renderProtected({ blockSuperuser: true });
        expect(screen.getByText("forbidden page")).toBeInTheDocument();
    });

    it("blockSuperuser permite al superusuario mientras impersona", () => {
        useAuthMock.mockReturnValue(
            authed({
                user: { ...authed().user, is_superuser: true },
                isImpersonating: true,
            })
        );
        renderProtected({ blockSuperuser: true });
        expect(screen.getByText("contenido protegido")).toBeInTheDocument();
    });

    it("blockSuperuser no afecta a un usuario común", () => {
        useAuthMock.mockReturnValue(authed());
        renderProtected({ blockSuperuser: true });
        expect(screen.getByText("contenido protegido")).toBeInTheDocument();
    });

    it("roles: permite si el usuario tiene el rol requerido", () => {
        useAuthMock.mockReturnValue(
            authed({ user: { ...authed().user, roles: ["Teacher"] } })
        );
        renderProtected({ roles: ["Teacher"] });
        expect(screen.getByText("contenido protegido")).toBeInTheDocument();
    });

    it("roles: bloquea si el usuario no tiene el rol requerido", () => {
        useAuthMock.mockReturnValue(authed());
        renderProtected({ roles: ["Teacher"] });
        expect(screen.getByText("forbidden page")).toBeInTheDocument();
    });

    it("permissions: permite solo con todos los permisos requeridos", () => {
        useAuthMock.mockReturnValue(
            authed({
                user: {
                    ...authed().user,
                    permissions: ["grades:read", "grades:write"],
                },
            })
        );
        renderProtected({ permissions: ["grades:read", "grades:write"] });
        expect(screen.getByText("contenido protegido")).toBeInTheDocument();
    });

    it("permissions: bloquea si falta algún permiso", () => {
        useAuthMock.mockReturnValue(
            authed({
                user: { ...authed().user, permissions: ["grades:read"] },
            })
        );
        renderProtected({ permissions: ["grades:read", "grades:write"] });
        expect(screen.getByText("forbidden page")).toBeInTheDocument();
    });
});