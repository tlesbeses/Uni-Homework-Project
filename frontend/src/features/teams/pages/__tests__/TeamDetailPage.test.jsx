import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TeamDetailPage } from "@/features/teams/pages/TeamDetailPage";

const { authMock } = vi.hoisted(() => ({
    authMock: {
        user: { id: 1, username: "ana" },
        isTeacher: true,
    },
}));

const { teamMock } = vi.hoisted(() => ({
    teamMock: {
        team: null,
        loading: false,
        error: "",
        reload: vi.fn(),
        handleRemoveMember: vi.fn(),
        removingId: null,
        handleChangeLeader: vi.fn(),
    },
}));

vi.mock("@/features/auth/providers/AuthProvider", () => ({
    useAuth: () => authMock,
}));
vi.mock("@/features/teams/hooks/useTeamDetail", () => ({
    useTeamDetail: () => teamMock,
}));
vi.mock("@/features/teams/components/MemberList", () => ({
    MemberList: () => <div data-testid="member-list" />,
}));
vi.mock("@/features/teams/components/AddMemberModal", () => ({
    AddMemberModal: () => <div data-testid="add-member-modal" />,
}));
vi.mock("@/features/teams/components/EditTeamModal", () => ({
    EditTeamModal: () => <div data-testid="edit-team-modal" />,
}));

function renderPage() {
    return render(
        <MemoryRouter initialEntries={["/teams/11"]}>
            <Routes>
                <Route path="/teams/:id" element={<TeamDetailPage />} />
            </Routes>
        </MemoryRouter>
    );
}

const sampleTeam = {
    id: 11,
    name: "Equipo Alpha",
    leader: { id: 1, first_name: "Pepe", last_name: "Perez" },
    section: { id: 2, name: "A", course: { id: 5, title: "Física" } },
    members: [{ id: 1, first_name: "Pepe", last_name: "Perez" }, { id: 2 }],
};

describe("TeamDetailPage", () => {
    beforeEach(() => {
        authMock.isTeacher = true;
        teamMock.team = null;
        teamMock.loading = false;
        teamMock.error = "";
        teamMock.removingId = null;
    });

    it("muestra el estado de carga", () => {
        teamMock.loading = true;
        renderPage();

        expect(screen.getByText("Cargando equipo...")).toBeInTheDocument();
    });

    it("muestra el error si la API falla", () => {
        teamMock.error = "Error de red";
        renderPage();

        expect(screen.getByText("Error de red")).toBeInTheDocument();
    });

    it("avisa cuando el equipo no existe", () => {
        renderPage();

        expect(
            screen.getByText("Equipo no encontrado.")
        ).toBeInTheDocument();
    });

    it("muestra el detalle con acciones para quien puede gestionar", () => {
        teamMock.team = sampleTeam;
        renderPage();

        expect(
            screen.getByRole("heading", { name: "Equipo Alpha" })
        ).toBeInTheDocument();
        expect(screen.getByText("Física")).toBeInTheDocument();
        expect(screen.getByText("Líder: Pepe Perez")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Editar" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "+ Agregar miembro" })
        ).toBeInTheDocument();
        expect(screen.getByTestId("member-list")).toBeInTheDocument();
        expect(screen.getByTestId("add-member-modal")).toBeInTheDocument();
        expect(screen.getByTestId("edit-team-modal")).toBeInTheDocument();
    });

    it("a un miembro sin permisos le oculta las acciones", () => {
        authMock.isTeacher = false;
        authMock.user = { id: 9, username: "luis" };
        teamMock.team = {
            ...sampleTeam,
            leader: { id: 1, first_name: "Pepe", last_name: "Perez" },
        };
        renderPage();

        expect(
            screen.queryByRole("button", { name: "Editar" })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "+ Agregar miembro" })
        ).not.toBeInTheDocument();
        expect(screen.getByTestId("member-list")).toBeInTheDocument();
    });
});