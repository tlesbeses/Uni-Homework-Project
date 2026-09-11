import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TeacherGradingPanel } from "@/features/grades/components/TeacherGradingPanel";

const { assignmentServiceMock } = vi.hoisted(() => ({
    assignmentServiceMock: { getAssignments: vi.fn() },
}));

const { courseServiceMock } = vi.hoisted(() => ({
    courseServiceMock: {
        getCourses: vi.fn(),
        getEnrollments: vi.fn(),
        getSections: vi.fn(),
    },
}));

const { teamServiceMock } = vi.hoisted(() => ({
    teamServiceMock: { getTeams: vi.fn() },
}));

const { gradeServiceMock } = vi.hoisted(() => ({
    gradeServiceMock: {
        getGrades: vi.fn(),
        gradeStudent: vi.fn(),
        gradeTeam: vi.fn(),
        getGradeHistory: vi.fn(),
    },
}));

vi.mock("@/features/assignments/services/assignmentService", () => assignmentServiceMock);
vi.mock("@/features/courses/services/courseService", () => courseServiceMock);
vi.mock("@/features/teams/services/teamService", () => teamServiceMock);
vi.mock("@/features/grades/services/gradeService", () => gradeServiceMock);

const mockAssignment = {
    id: 11,
    title: "Tarea 1",
    max_score: 10,
    description: "Descripción de la tarea",
    course: { id: 1, title: "Curso A", description: "Desc curso" },
};

const mockCourse = { id: 1, title: "Curso A" };

const mockTeam = {
    id: 101,
    name: "Equipo 1",
    leader: { id: 20 },
    members: [
        { student: { id: 20, first_name: "Ana", last_name: "López" } },
        { student: { id: 21, first_name: "Luis", last_name: "" } },
    ],
};

const mockApprovedEnrollment = {
    student: { id: 20, first_name: "Ana", last_name: "López" },
    status: "APPROVED",
    section: null,
};

const mockApprovedUnteamed = {
    student: { id: 30, first_name: "Mara", last_name: "Solo" },
    status: "APPROVED",
    section: null,
};

const mockPendingEnrollment = {
    student: { id: 22, first_name: "Zeta", last_name: "Pend" },
    status: "PENDING",
    section: null,
};

function renderPanel() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return {
        user: userEvent.setup(),
        ...render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <TeacherGradingPanel />
                </MemoryRouter>
            </QueryClientProvider>
        ),
    };
}

beforeEach(() => {
    Object.values(courseServiceMock).forEach((fn) => fn.mockReset());
    Object.values(assignmentServiceMock).forEach((fn) => fn.mockReset());
    Object.values(teamServiceMock).forEach((fn) => fn.mockReset());
    Object.values(gradeServiceMock).forEach((fn) => fn.mockReset());

    assignmentServiceMock.getAssignments.mockResolvedValue([mockAssignment]);
    courseServiceMock.getCourses.mockResolvedValue([mockCourse]);
    courseServiceMock.getEnrollments.mockResolvedValue({
        results: [
            mockApprovedEnrollment,
            mockApprovedUnteamed,
            mockPendingEnrollment,
        ],
        next: null,
    });
    courseServiceMock.getSections.mockResolvedValue({
        results: [],
        next: null,
    });
    teamServiceMock.getTeams.mockResolvedValue([mockTeam]);
    gradeServiceMock.getGrades.mockResolvedValue([]);
    gradeServiceMock.getGradeHistory.mockResolvedValue([]);
});

describe("TeacherGradingPanel", () => {
    it("carga los equipos al elegir una asignación y muestra sus integrantes", async () => {
        const { user } = renderPanel();

        const assignSelect = await screen.findByRole("combobox", {
            name: /asignación/i,
        });

        await user.selectOptions(assignSelect, "11");

        expect(await screen.findByText("Equipo 1")).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: /Equipo 1/i })
        );

        expect(await screen.findByText("Ana López")).toBeInTheDocument();
        expect(screen.getByText("Luis")).toBeInTheDocument();
    });

    it("muestra solo estudiantes aprobados y distingue los que no tienen equipo", async () => {
        const { user } = renderPanel();

        const assignSelect = await screen.findByRole("combobox", {
            name: /asignación/i,
        });
        await user.selectOptions(assignSelect, "11");

        await screen.findByText("Equipo 1");

        expect(
            await screen.findByText("Estudiantes sin equipo")
        ).toBeInTheDocument();
        expect(screen.getByText("Mara Solo")).toBeInTheDocument();
        expect(screen.queryByText("Zeta Pend")).not.toBeInTheDocument();
    });

    it("muestra el detalle de la asignación al seleccionar un equipo", async () => {
        const { user } = renderPanel();

        const assignSelect = await screen.findByRole("combobox", {
            name: /asignación/i,
        });
        await user.selectOptions(assignSelect, "11");

        await screen.findByText("Equipo 1");
        await user.click(
            screen.getByRole("button", { name: /Equipo 1/i })
        );

        expect(
            await screen.findByText("Información de la asignación")
        ).toBeInTheDocument();
        expect(screen.getByText("Tarea 1")).toBeInTheDocument();
        expect(screen.getByText(/Puntaje máximo: 10/)).toBeInTheDocument();
    });
});