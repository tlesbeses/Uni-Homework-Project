import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TeamsPage } from "@/features/teams/pages/TeamsPage";

const { authMock } = vi.hoisted(() => ({
    authMock: {
        user: { id: 1, username: "ana" },
        isTeacher: true,
    },
}));

const { teamsMock } = vi.hoisted(() => ({
    teamsMock: {
        teams: [],
        loading: false,
        error: "",
        loadTeams: vi.fn(),
    },
}));

const { deleteMock } = vi.hoisted(() => ({
    deleteMock: { mutateAsync: vi.fn() },
}));

vi.mock("@/features/auth/providers/AuthProvider", () => ({
    useAuth: () => authMock,
}));
vi.mock("@/features/teams/hooks/useTeams", () => ({
    useTeams: () => teamsMock,
}));
vi.mock("@/features/teams/hooks/useTeamMutations", () => ({
    useDeleteTeam: () => deleteMock,
}));
vi.mock("@/features/courses/services/courseService", () => ({
    getEnrollments: vi.fn(),
    getSections: vi.fn(),
}));
vi.mock("@/features/teams/components/CreateTeamModal", () => ({
    CreateTeamModal: () => <div data-testid="create-team-modal" />,
}));
vi.mock("@/features/teams/components/EditTeamModal", () => ({
    EditTeamModal: () => <div data-testid="edit-team-modal" />,
}));

import { getEnrollments, getSections } from "@/features/courses/services/courseService";

function renderPage() {
    return render(
        <MemoryRouter initialEntries={["/teams"]}>
            <Routes>
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/teams/:id" element={<div>Detalle Stub</div>} />
            </Routes>
        </MemoryRouter>
    );
}

const sampleTeams = [
    {
        id: 11,
        name: "Equipo Alpha",
        leader: { id: 1, first_name: "Pepe", last_name: "Perez" },
        section: { id: 2, name: "A", course: { id: 5, title: "Física" } },
        members: [{ id: 1 }, { id: 2 }],
    },
];

describe("TeamsPage", () => {
    beforeEach(() => {
        authMock.isTeacher = true;
        teamsMock.teams = [];
        teamsMock.loading = false;
        teamsMock.error = "";
        teamsMock.loadTeams.mockReset();
        deleteMock.mutateAsync.mockReset();
        deleteMock.mutateAsync.mockResolvedValue({});
        getEnrollments.mockResolvedValue({ results: [] });
        getSections.mockResolvedValue({ results: [] });
    });

    it("muestra el estado de carga", () => {
        teamsMock.loading = true;
        renderPage();

        expect(screen.getByText("Cargando equipos...")).toBeInTheDocument();
    });

    it("muestra el error si falla la carga de equipos", () => {
        teamsMock.error = "Error de red";
        renderPage();

        expect(screen.getByText("Error de red")).toBeInTheDocument();
    });

    it("avisa cuando no hay equipos disponibles", () => {
        renderPage();

        expect(
            screen.getByText("No hay equipos disponibles.")
        ).toBeInTheDocument();
    });

    it("lista los equipos del profesor con filtros y boton de creacion", () => {
        teamsMock.teams = sampleTeams;
        renderPage();

        expect(
            screen.getByRole("heading", { name: "Equipos" })
        ).toBeInTheDocument();
        expect(
            screen.getByText("Gestiona los equipos de tus cursos.")
        ).toBeInTheDocument();
        expect(screen.getByText("Equipo Alpha")).toBeInTheDocument();
        expect(screen.getByText("Filtrar por curso")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "+ Nuevo equipo" })
        ).toBeInTheDocument();
        expect(screen.getByTestId("create-team-modal")).toBeInTheDocument();
    });

    it("a un estudiante no le muestra los filtros de curso", () => {
        authMock.isTeacher = false;
        teamsMock.teams = sampleTeams;
        renderPage();

        expect(
            screen.getByText("Crea o consulta los equipos de tus cursos.")
        ).toBeInTheDocument();
        expect(
            screen.queryByText("Filtrar por curso")
        ).not.toBeInTheDocument();
    });

    it("pide confirmacion y elimina el equipo elegido", async () => {
        teamsMock.teams = sampleTeams;
        const user = userEvent.setup();
        renderPage();

        await user.click(screen.getByRole("button", { name: "Eliminar" }));

        const dialog = await screen.findByRole("dialog");
        expect(
            within(dialog).getByText(/¿Eliminar el equipo "Equipo Alpha"/)
        ).toBeInTheDocument();

        await user.click(
            within(dialog).getByRole("button", { name: "Eliminar" })
        );

        await waitFor(() =>
            expect(deleteMock.mutateAsync).toHaveBeenCalledWith(
                expect.objectContaining({ id: 11 })
            )
        );
    });
});