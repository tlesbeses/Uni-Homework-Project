import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CourseProgress } from "@/features/courses/components/CourseProgress";

const { progressMock } = vi.hoisted(() => ({
    progressMock: {
        progress: null,
        loading: false,
        error: "",
    },
}));

const useCourseProgressMock = vi.fn(() => progressMock);

vi.mock("@/features/courses/hooks/useCourseProgress", () => ({
    useCourseProgress: (courseId, sectionId) =>
        useCourseProgressMock(courseId, sectionId),
}));

const { getSectionsMock } = vi.hoisted(() => ({
    getSectionsMock: vi.fn(),
}));

vi.mock("@/features/courses/services/courseService", () => ({
    getSections: (...args) => getSectionsMock(...args),
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
    beforeEach(() => {
        useCourseProgressMock.mockClear();
        getSectionsMock.mockReset();
        getSectionsMock.mockResolvedValue({ results: [] });
    });

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

    it("pasa el sectionId al hook de progreso", () => {
        render(<CourseProgress courseId={5} sectionId={42} />);
        expect(useCourseProgressMock).toHaveBeenCalledWith(5, 42);
    });

    it("muestra el nombre de la sección en el encabezado", () => {
        progressMock.progress = {
            course_title: "Álgebra",
            section_title: "1TS1",
            student_count: 4,
            overall_avg_final: 75,
            assignments: [],
        };

        render(<CourseProgress courseId={5} sectionId={42} />);
        openPanel();

        expect(
            screen.getByText("Álgebra · Sección 1TS1")
        ).toBeInTheDocument();
    });

    it("muestra el selector de sección solo en móvil con las secciones cargadas", async () => {
        mockMedia(false);
        getSectionsMock.mockResolvedValue({
            results: [
                { id: 10, name: "1TS1" },
                { id: 11, name: "1TS2" },
            ],
        });

        render(
            <CourseProgress
                courseId={5}
                sectionId={10}
                onSectionChange={() => {}}
            />
        );
        openPanel();

        const select = await screen.findByLabelText("Seleccionar sección");
        expect(select).toHaveValue("10");
        expect(within(select).getByText("1TS1")).toBeInTheDocument();
        expect(within(select).getByText("1TS2")).toBeInTheDocument();
        expect(screen.getByText("Todas las secciones")).toBeInTheDocument();
    });

    it("oculta el selector de sección en desktop", async () => {
        mockMedia(true);
        getSectionsMock.mockResolvedValue({
            results: [
                { id: 10, name: "1TS1" },
                { id: 11, name: "1TS2" },
            ],
        });

        render(
            <CourseProgress
                courseId={5}
                sectionId={10}
                onSectionChange={() => {}}
            />
        );
        openPanel();

        expect(
            screen.queryByLabelText("Seleccionar sección")
        ).not.toBeInTheDocument();
    });

    it("notifica el cambio de sección al elegir una opción en móvil", async () => {
        mockMedia(false);
        getSectionsMock.mockResolvedValue({
            results: [
                { id: 10, name: "1TS1" },
                { id: 11, name: "1TS2" },
            ],
        });
        const onSectionChange = vi.fn();

        render(
            <CourseProgress
                courseId={5}
                sectionId={10}
                onSectionChange={onSectionChange}
            />
        );
        openPanel();

        const select = await screen.findByLabelText("Seleccionar sección");
        fireEvent.change(select, { target: { value: "11" } });
        expect(onSectionChange).toHaveBeenCalledWith("11");

        fireEvent.change(select, { target: { value: "" } });
        expect(onSectionChange).toHaveBeenCalledWith(null);
    });

    it("en desktop muestra la tabla de estudiantes con notas finales", async () => {
        mockMedia(true);
        progressMock.progress = {
            course_title: "Álgebra",
            student_count: 2,
            overall_avg_final: 80,
            assignments: [],
            students: [
                { id: 1, name: "Ana", graded_count: 3, final: 90 },
                { id: 2, name: "Luis", graded_count: 1, final: null },
            ],
        };

        render(<CourseProgress courseId={5} />);
        openPanel();

        const table = await screen.findByRole("table", {
            name: "Progreso por estudiante",
        });
        expect(within(table).getByText("Ana")).toBeInTheDocument();
        expect(within(table).getByText("3")).toBeInTheDocument();
        expect(within(table).getByText("90%")).toBeInTheDocument();
        expect(within(table).getByText("Luis")).toBeInTheDocument();
        expect(within(table).getByText("1")).toBeInTheDocument();
        expect(within(table).getByText("—")).toBeInTheDocument();
    });

    it("no muestra la tabla de estudiantes cuando no hay estudiantes", () => {
        progressMock.progress = {
            course_title: "Álgebra",
            student_count: 0,
            overall_avg_final: null,
            assignments: [],
        };

        render(<CourseProgress courseId={5} />);
        openPanel();

        expect(
            screen.queryByRole("table", {
                name: "Progreso por estudiante",
            })
        ).not.toBeInTheDocument();
    });
});
