import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StudentCourseGrades } from "@/features/grades/components/StudentCourseGrades";

const { gradeServiceMock } = vi.hoisted(() => ({
    gradeServiceMock: {
        getGrades: vi.fn(),
        getGradeEvolution: vi.fn(),
    },
}));

const { courseServiceMock } = vi.hoisted(() => ({
    courseServiceMock: { getDashboard: vi.fn() },
}));

vi.mock("@/features/grades/services/gradeService", () => gradeServiceMock);
vi.mock("@/features/courses/services/courseService", () => courseServiceMock);

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
                <StudentCourseGrades />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

beforeEach(() => {
    gradeServiceMock.getGrades.mockReset();
    gradeServiceMock.getGradeEvolution.mockReset();
    courseServiceMock.getDashboard.mockReset();

    gradeServiceMock.getGrades.mockResolvedValue([
        {
            id: 1,
            assignment: {
                id: 101,
                title: "Parcial 1",
                max_score: 100,
                course: { id: 3, title: "Introduccion a la Programacion" },
            },
            score: 10,
            graded_by: { username: "profe", first_name: "Profe" },
        },
    ]);
    gradeServiceMock.getGradeEvolution.mockResolvedValue({ points: [] });
    courseServiceMock.getDashboard.mockResolvedValue({
        final_scores: { 3: "70.00" },
        final_breakdowns: {
            3: [
                {
                    type: "ACUMULADO",
                    parcial: "PRIMERO",
                    pct: "35.00",
                    average: "100.00",
                    assignments: 4,
                },
                {
                    type: "EXAMEN",
                    parcial: "PRIMERO",
                    pct: "35.00",
                    average: "100.00",
                    assignments: 1,
                },
            ],
        },
        parcial_scores: {
            3: { PRIMERO: "100.00", SEGUNDO: null },
        },
    });
});

describe("StudentCourseGrades", () => {
    it("muestra la nota final y las notas por parcial del curso", async () => {
        renderPage();

        expect(
            await screen.findByText("Introduccion a la Programacion")
        ).toBeInTheDocument();
        expect(await screen.findByText(/Nota final: 70.00%/)).toBeInTheDocument();
        expect(
            await screen.findByText(/Parcial 1: 100.00% · Parcial 2: —/)
        ).toBeInTheDocument();
    });

    it("no muestra la línea de parciales cuando no hay datos", async () => {
        courseServiceMock.getDashboard.mockResolvedValue({
            final_scores: { 3: "70.00" },
            final_breakdowns: {},
            parcial_scores: {},
        });

        renderPage();

        expect(
            await screen.findByText(/Nota final: 70.00%/)
        ).toBeInTheDocument();
        expect(screen.queryByText(/Parcial 1/)).not.toBeInTheDocument();
    });
});