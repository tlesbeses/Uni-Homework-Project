import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

function mockViewport(isDesktop) {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: isDesktop,
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
                category: "EXAMEN",
                parcial: "PRIMERO",
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

    it("en móvil apila el título y los datos en filas completas", async () => {
        mockViewport(false);
        renderPage();

        expect(
            await screen.findByText("Introduccion a la Programacion")
        ).toBeInTheDocument();
        expect(await screen.findByText(/Nota final: 70.00%/)).toBeInTheDocument();

        const header = screen
            .getByText("Introduccion a la Programacion")
            .closest("button");
        expect(header).toHaveClass("flex-col", "sm:flex-row");
        expect(
            screen.getByText(/35\.00% Acum\. P1 \(100\.00%\)/)
        ).toBeInTheDocument();
    });

    it("no muestra el botón Imprimir / PDF", async () => {
        renderPage();
        expect(
            await screen.findByText("Introduccion a la Programacion")
        ).toBeInTheDocument();
        expect(
            screen.queryByText("Imprimir / PDF")
        ).not.toBeInTheDocument();
    });

    it("no muestra 'Evaluada por' y mantiene el puntaje a la derecha con su parcial", async () => {
        mockViewport(false);
        renderPage();

        const courseHeader = await screen.findByText(
            "Introduccion a la Programacion"
        );
        fireEvent.click(courseHeader);

        const title = await screen.findByText("Parcial 1");
        expect(screen.queryByText(/Evaluada por:/)).not.toBeInTheDocument();
        const row = title.closest("li");
        expect(row).not.toHaveClass("flex-col");
        expect(row).toHaveClass("justify-between");
        const badge = screen.getByText("Exam. Parcial 1");
        expect(badge).toBeInTheDocument();
        expect(row).toHaveTextContent("10 / 100");
        const score = screen.getByText("10 / 100");
        expect(score).toHaveClass("shrink-0");
    });
});