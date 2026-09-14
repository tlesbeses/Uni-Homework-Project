import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GradesReportPage } from "@/features/grades/pages/GradesReportPage";

const { toastMock } = vi.hoisted(() => ({
    toastMock: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

const { gradeServiceMock } = vi.hoisted(() => ({
    gradeServiceMock: {
        getSectionGradesReport: vi.fn(),
        exportSectionGrades: vi.fn(),
        exportSectionGradesCsv: vi.fn(),
        gradeStudent: vi.fn(),
    },
}));

const { courseServiceMock } = vi.hoisted(() => ({
    courseServiceMock: { getSections: vi.fn() },
}));

const { useCoursesMock, downloadBlobMock } = vi.hoisted(() => ({
    useCoursesMock: vi.fn(),
    downloadBlobMock: vi.fn(),
}));

vi.mock("react-toastify", () => ({ toast: toastMock }));
vi.mock("@/features/grades/services/gradeService", () => gradeServiceMock);
vi.mock("@/features/courses/services/courseService", () => courseServiceMock);
vi.mock("@/shared/utils/downloadBlob", () => ({
    downloadBlob: downloadBlobMock,
}));
vi.mock("@/features/courses/hooks/useCourses", () => ({
    useCourses: useCoursesMock,
}));

const report = {
    course: "Math 101",
    section: "1TS1",
    assignments: [
        { id: 10, title: "Parcial", max_score: 100, category: "ACUMULADO", parcial: "PRIMERO" },
    ],
    students: [{ id: 7, name: "Ana López", grades: { "10": 75 }, total: 75 }],
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
            <MemoryRouter initialEntries={["/grades/report?course=1&section=2"]}>
                <GradesReportPage />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

async function waitForReport() {
    await waitFor(() =>
        expect(screen.getByText("Ana López")).toBeInTheDocument()
    );
}

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

beforeEach(() => {
    useCoursesMock.mockReset();
    downloadBlobMock.mockReset();
    courseServiceMock.getSections.mockReset();
    gradeServiceMock.getSectionGradesReport.mockReset();
    gradeServiceMock.exportSectionGrades.mockReset();
    gradeServiceMock.exportSectionGradesCsv.mockReset();
    gradeServiceMock.gradeStudent.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();

    useCoursesMock.mockReturnValue({
        courses: [{ id: 1, title: "Math 101" }],
        loading: false,
    });
    courseServiceMock.getSections.mockResolvedValue({
        results: [{ id: 2, name: "1TS1" }],
    });
    gradeServiceMock.getSectionGradesReport.mockResolvedValue(report);
    gradeServiceMock.gradeStudent.mockResolvedValue({ id: 7, score: 85 });
    gradeServiceMock.exportSectionGrades.mockResolvedValue(
        new Blob([""], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
    );
    gradeServiceMock.exportSectionGradesCsv.mockResolvedValue(
        new Blob([""], { type: "text/csv" })
    );
});

describe("GradesReportPage", () => {
    it("carga y muestra el reporte con estudiantes, columnas y notas", async () => {
        mockViewport(true);
        renderPage();
        await waitForReport();

        expect(screen.getByText("Math 101 — 1TS1")).toBeInTheDocument();
        expect(screen.getByText("Parcial")).toBeInTheDocument();
        expect(screen.getByText("Total")).toBeInTheDocument();
        expect(screen.getByText("75 /100")).toBeInTheDocument();
    });

    it("rechaza una nota fuera de rango (0..max) sin llamar a la API", async () => {
        renderPage();
        await waitForReport();

        fireEvent.click(screen.getByText("75 /100"));
        const input = screen.getByDisplayValue("75");
        fireEvent.change(input, { target: { value: "120" } });
        fireEvent.keyDown(input, { key: "Enter" });

        await waitFor(() =>
            expect(toastMock.error).toHaveBeenCalledWith(
                "La nota debe estar entre 0 y 100."
            )
        );
        expect(gradeServiceMock.gradeStudent).not.toHaveBeenCalled();
    });

    it("guarda una nota válida y actualiza el total", async () => {
        mockViewport(true);
        gradeServiceMock.getSectionGradesReport
            .mockResolvedValueOnce({
                ...report,
                ponderacion_enabled: true,
                students: [
                    {
                        id: 7,
                        name: "Ana López",
                        grades: { "10": 75 },
                        total: 75,
                        final: 50,
                        parcial_scores: { PRIMERO: "75.00", SEGUNDO: null },
                    },
                ],
            })
            .mockResolvedValueOnce({
                ...report,
                ponderacion_enabled: true,
                students: [
                    {
                        id: 7,
                        name: "Ana López",
                        grades: { "10": 85 },
                        total: 85,
                        final: 56,
                        parcial_scores: { PRIMERO: "85.00", SEGUNDO: null },
                    },
                ],
            });

        renderPage();
        await waitFor(() =>
            expect(screen.getByText("75.00%")).toBeInTheDocument()
        );

        fireEvent.click(screen.getByText("75 /100"));
        const input = screen.getByDisplayValue("75");
        fireEvent.change(input, { target: { value: "85" } });
        fireEvent.keyDown(input, { key: "Enter" });

        await waitFor(() =>
            expect(gradeServiceMock.gradeStudent).toHaveBeenCalledWith(
                10,
                7,
                85
            )
        );
        await waitFor(() =>
            expect(toastMock.success).toHaveBeenCalledWith("Nota guardada.")
        );
        await waitFor(() =>
            expect(screen.getByText("85 /100")).toBeInTheDocument()
        );
    });

    it("exporta el reporte a Excel con el nombre esperado", async () => {
        renderPage();
        await waitForReport();

        fireEvent.click(screen.getByText("Descargar Excel"));

        await waitFor(() =>
            expect(gradeServiceMock.exportSectionGrades).toHaveBeenCalledWith(
                "2"
            )
        );
        await waitFor(() =>
            expect(downloadBlobMock).toHaveBeenCalledWith(
                expect.any(Blob),
                "notas_Math 101_1TS1.xlsx"
            )
        );
        expect(toastMock.success).toHaveBeenCalledWith(
            "Notas exportadas a Excel."
        );
    });

    it("exporta el reporte a CSV con el nombre esperado", async () => {
        renderPage();
        await waitForReport();

        fireEvent.click(screen.getByText("Descargar CSV"));

        await waitFor(() =>
            expect(gradeServiceMock.exportSectionGradesCsv).toHaveBeenCalledWith(
                "2"
            )
        );
        await waitFor(() =>
            expect(downloadBlobMock).toHaveBeenCalledWith(
                expect.any(Blob),
                "notas_Math 101_1TS1.csv"
            )
        );
        expect(toastMock.success).toHaveBeenCalledWith(
            "Notas exportadas a CSV."
        );
    });

    it("muestra columnas y notas por parcial cuando hay ponderación", async () => {
        mockViewport(true);
        gradeServiceMock.getSectionGradesReport.mockResolvedValue({
            ...report,
            assignments: [
                { id: 10, title: "Parcial", max_score: 100, category: "ACUMULADO", parcial: "PRIMERO" },
            ],
            ponderacion_enabled: true,
            students: [
                {
                    id: 7,
                    name: "Ana López",
                    grades: { "10": 75 },
                    total: 75,
                    final: 52.5,
                    parcial_scores: {
                        PRIMERO: "75.00",
                        SEGUNDO: null,
                    },
                },
            ],
        });

        renderPage();
        await waitForReport();

        expect(screen.getByText("Parcial 1")).toBeInTheDocument();
        expect(screen.getByText("Parcial 2")).toBeInTheDocument();
        expect(screen.getByText("75.00%")).toBeInTheDocument();
        expect(screen.getByText("Nota final")).toBeInTheDocument();
    });

    it("oculta las columnas por parcial sin ponderación", async () => {
        mockViewport(true);
        gradeServiceMock.getSectionGradesReport.mockResolvedValue({
            ...report,
            assignments: [
                { id: 10, title: "Parcial", max_score: 100, category: "ACUMULADO", parcial: "PRIMERO" },
            ],
            ponderacion_enabled: false,
        });

        renderPage();
        await waitForReport();

        expect(screen.queryByText("Parcial 1")).not.toBeInTheDocument();
        expect(screen.queryByText("Parcial 2")).not.toBeInTheDocument();
    });

    it("no muestra el botón Imprimir / PDF", async () => {
        renderPage();
        await waitForReport();

        expect(screen.queryByText("Imprimir / PDF")).not.toBeInTheDocument();
        expect(screen.getByText("Descargar CSV")).toBeInTheDocument();
        expect(screen.getByText("Descargar Excel")).toBeInTheDocument();
    });

    it("muestra la etiqueta de parcial en el encabezado de cada asignación", async () => {
        mockViewport(true);
        renderPage();
        await waitForReport();

        expect(screen.getByText("Acum. P1")).toBeInTheDocument();
    });

    it("actualiza parcial y final al editar una nota tras refetchear el reporte", async () => {
        mockViewport(true);
        gradeServiceMock.getSectionGradesReport
            .mockResolvedValueOnce({
                ...report,
                ponderacion_enabled: true,
                students: [
                    {
                        id: 7,
                        name: "Ana López",
                        grades: { "10": 75 },
                        total: 75,
                        final: 50,
                        parcial_scores: { PRIMERO: "75.00", SEGUNDO: null },
                    },
                ],
            })
            .mockResolvedValueOnce({
                ...report,
                ponderacion_enabled: true,
                students: [
                    {
                        id: 7,
                        name: "Ana López",
                        grades: { "10": 85 },
                        total: 85,
                        final: 56,
                        parcial_scores: { PRIMERO: "85.00", SEGUNDO: null },
                    },
                ],
            });

        renderPage();
        await waitFor(() =>
            expect(screen.getByText("50%")).toBeInTheDocument()
        );

        fireEvent.click(screen.getByText("75 /100"));
        const input = screen.getByDisplayValue("75");
        fireEvent.change(input, { target: { value: "85" } });
        fireEvent.keyDown(input, { key: "Enter" });

        await waitFor(() =>
            expect(screen.getByText("85.00%")).toBeInTheDocument()
        );
        await waitFor(() =>
            expect(screen.getByText("56%")).toBeInTheDocument()
        );
        expect(gradeServiceMock.getSectionGradesReport).toHaveBeenCalledTimes(2);
    });

    it("en móvil renderiza cards con la nota final y permite expandir los parciales", async () => {
        mockViewport(false);
        gradeServiceMock.getSectionGradesReport.mockResolvedValue({
            ...report,
            ponderacion_enabled: true,
            students: [
                {
                    id: 7,
                    name: "Ana López",
                    grades: { "10": 75 },
                    total: 75,
                    final: 50,
                    parcial_scores: { PRIMERO: "75.00", SEGUNDO: null },
                },
            ],
        });

        renderPage();
        await waitForReport();

        expect(screen.queryByRole("table")).not.toBeInTheDocument();
        const card = screen.getAllByRole("listitem")[0];

        expect(within(card).getByText("Ana López")).toBeInTheDocument();
        expect(within(card).getByText("50%")).toBeInTheDocument();
        expect(within(card).getByText("75 /100")).toBeInTheDocument();

        expect(
            within(card).queryByText("75.00%")
        ).not.toBeInTheDocument();

        const toggle = within(card).getByRole("button", {
            name: /Ver detalles/,
        });
        expect(toggle).toHaveAttribute("aria-expanded", "false");

        fireEvent.click(toggle);
        expect(
            within(card).getByText("75.00%")
        ).toBeInTheDocument();

        fireEvent.click(within(card).getByText("75 /100"));
        const input = screen.getByDisplayValue("75");
        fireEvent.change(input, { target: { value: "90" } });
        fireEvent.keyDown(input, { key: "Enter" });

        await waitFor(() =>
            expect(gradeServiceMock.gradeStudent).toHaveBeenCalledWith(10, 7, 90)
        );
    });

    it("en móvil muestra como máximo 4 asignaciones y permite ver las restantes", async () => {
        mockViewport(false);
        const manyAssignments = Array.from({ length: 5 }, (_, i) => ({
            id: 10 + i,
            title: `Tarea ${i + 1}`,
            max_score: 100,
            category: "ACUMULADO",
            parcial: "PRIMERO",
        }));
        gradeServiceMock.getSectionGradesReport.mockResolvedValue({
            ...report,
            assignments: manyAssignments,
            students: [
                {
                    id: 7,
                    name: "Ana López",
                    grades: Object.fromEntries(
                        manyAssignments.map((a) => [String(a.id), 75])
                    ),
                    total: 75,
                },
            ],
        });

        renderPage();
        await waitForReport();

        const card = screen.getAllByRole("listitem")[0];
        expect(
            within(card).getByText("Tarea 1 (Acum. P1)")
        ).toBeInTheDocument();
        expect(
            within(card).getByText("Tarea 4 (Acum. P1)")
        ).toBeInTheDocument();
        expect(
            within(card).queryByText("Tarea 5 (Acum. P1)")
        ).not.toBeInTheDocument();
        expect(within(card).queryByText("Total")).not.toBeInTheDocument();
        expect(
            within(card).queryByRole("button", { name: /Ver menos/ })
        ).not.toBeInTheDocument();

        fireEvent.click(
            within(card).getByRole("button", { name: /Ver más/ })
        );

        expect(
            within(card).getByText("Tarea 5 (Acum. P1)")
        ).toBeInTheDocument();
        expect(
            within(card).getByRole("button", { name: /Ver menos/ })
        ).toBeInTheDocument();
    });
});