import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CourseProgress } from "@/features/courses/components/CourseProgress";

const { progressMock } = vi.hoisted(() => ({
    progressMock: {
        progress: null,
        loading: false,
        error: "",
    },
}));

vi.mock("@/features/courses/hooks/useCourseProgress", () => ({
    useCourseProgress: () => progressMock,
}));

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

function openPanel() {
    fireEvent.click(
        screen.getByRole("button", { name: /Progreso del curso/ })
    );
}

describe("CourseProgress", () => {
    it("muestra el trigger cuando el panel está cerrado", () => {
        progressMock.progress = {
            course_title: "Álgebra",
            student_count: 10,
            overall_avg_final: 82,
            assignments: [],
        };

        render(<CourseProgress courseId={5} />);

        expect(
            screen.getByRole("button", { name: /Progreso del curso/ })
        ).toBeInTheDocument();
        expect(
            screen.queryByText("Ocultar ▲")
        ).not.toBeInTheDocument();
    });

    it("en desktop muestra la tabla con encabezados y una fila de datos", () => {
        mockMedia(true);
        progressMock.progress = {
            course_title: "Álgebra",
            student_count: 10,
            overall_avg_final: 82,
            assignments: [
                {
                    id: 1,
                    title: "TP1",
                    graded: 8,
                    pending: 2,
                    avg: 90,
                    max: 10,
                    min: 5,
                },
            ],
        };

        render(<CourseProgress courseId={5} />);
        openPanel();

        const table = screen.getByRole("table", {
            name: "Progreso por tarea",
        });
        expect(within(table).getByText("TP1")).toBeInTheDocument();
        expect(within(table).getByText("8/10")).toBeInTheDocument();
        expect(within(table).getByText("10")).toBeInTheDocument();
        expect(within(table).getByText("5")).toBeInTheDocument();
        expect(screen.getByText("Ocultar ▲")).toBeInTheDocument();
    });

    it("en móvil muestra la card de tarea con Máx/Mín detrás de Ver detalles", () => {
        mockMedia(false);
        progressMock.progress = {
            course_title: "Álgebra",
            student_count: 10,
            overall_avg_final: 82,
            assignments: [
                {
                    id: 1,
                    title: "TP1",
                    graded: 8,
                    pending: 2,
                    avg: 90,
                    max: 10,
                    min: 5,
                },
            ],
        };

        render(<CourseProgress courseId={5} />);
        openPanel();

        expect(screen.queryByRole("table")).not.toBeInTheDocument();
        const cards = screen.getAllByRole("listitem");
        expect(cards).toHaveLength(1);
        const card = cards[0];
        expect(within(card).getByText("TP1")).toBeInTheDocument();
        expect(within(card).getByText("8/10")).toBeInTheDocument();
        expect(within(card).getByText("90")).toBeInTheDocument();

        const toggle = within(card).getByRole("button", {
            name: /Ver detalles/,
        });
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(within(card).queryByText("10")).not.toBeInTheDocument();
        expect(within(card).queryByText("5")).not.toBeInTheDocument();

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(within(card).getByText("10")).toBeInTheDocument();
        expect(within(card).getByText("5")).toBeInTheDocument();
    });

    it("muestra texto vacío cuando no hay tareas publicadas", () => {
        progressMock.progress = {
            course_title: "Álgebra",
            student_count: 0,
            overall_avg_final: null,
            assignments: [],
        };

        render(<CourseProgress courseId={5} />);
        openPanel();

        expect(
            screen.getByText("El curso aún no tiene tareas publicadas.")
        ).toBeInTheDocument();
    });
});
