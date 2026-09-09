import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    fireEvent,
    render,
    screen,
    waitFor,
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
    assignments: [{ id: 10, title: "Parcial", max_score: 100 }],
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
        renderPage();
        await waitForReport();

        expect(screen.getByText("Math 101 — 1TS1")).toBeInTheDocument();
        expect(screen.getByText("Parcial")).toBeInTheDocument();
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
        renderPage();
        await waitForReport();

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
        expect(screen.getByText("85 /100")).toBeInTheDocument();
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
        gradeServiceMock.getSectionGradesReport.mockResolvedValue({
            ...report,
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
        gradeServiceMock.getSectionGradesReport.mockResolvedValue({
            ...report,
            ponderacion_enabled: false,
        });

        renderPage();
        await waitForReport();

        expect(screen.queryByText("Parcial 1")).not.toBeInTheDocument();
        expect(screen.queryByText("Parcial 2")).not.toBeInTheDocument();
    });
});