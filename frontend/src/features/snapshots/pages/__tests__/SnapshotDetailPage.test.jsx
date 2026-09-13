import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SnapshotDetailPage } from "@/features/snapshots/pages/SnapshotDetailPage";

const { useSnapshotMock } = vi.hoisted(() => ({
    useSnapshotMock: vi.fn(),
}));

vi.mock("@/features/snapshots/hooks/useSnapshot", () => ({
    useSnapshot: useSnapshotMock,
}));

vi.mock("@/features/snapshots/services/snapshotService", () => ({
    exportSnapshotGrades: vi.fn(),
    exportSnapshotGradesCsv: vi.fn(),
}));

const snapshot = {
    id: 10,
    course_title: "Álgebra",
    section_name: "P1",
    teacher_name: "Per Profesor",
    reason: "course_delete",
    created_at: "2026-08-01T10:00:00Z",
    stats: {
        approved_students: 1,
        total_requests: 2,
        teams: 1,
        assignments: 1,
        grades: 2,
    },
    payload: {
        enrollments: [
            {
                student_id: 7,
                username: "ana",
                first_name: "Ana",
                last_name: "Pez",
                status: "APPROVED",
            },
        ],
        assignments: [
            {
                id: 21,
                title: "TP1",
                max_score: 10,
                due_date: "2026-06-01",
                is_published: true,
            },
        ],
        teams: [
            {
                id: 1,
                name: "Equipo A",
                leader: { name: "Ana" },
                members: [{ id: 7, name: "Ana Pez" }],
            },
        ],
        grades: [
            {
                assignment_id: 21,
                student_id: 7,
                score: 9,
                is_individual: true,
            },
        ],
        final_grades: [{ student_id: 7, score: 90 }],
    },
};

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

function renderDetail() {
    return render(
        <MemoryRouter initialEntries={["/snapshots/10"]}>
            <Routes>
                <Route
                    path="/snapshots/:id"
                    element={<SnapshotDetailPage />}
                />
            </Routes>
        </MemoryRouter>
    );
}

describe("SnapshotDetailPage", () => {
    it("en desktop muestra las 3 tablas con los encabezados correctos", () => {
        mockMedia(true);
        useSnapshotMock.mockReturnValue({
            snapshot,
            loading: false,
            error: "",
        });

        renderDetail();

        expect(
            screen.getByRole("table", { name: "Estudiantes" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("table", { name: "Tareas" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("table", { name: "Notas" })
        ).toBeInTheDocument();

        const studentHeaders = within(
            screen.getByRole("table", { name: "Estudiantes" })
        )
            .getAllByRole("columnheader")
            .map((th) => th.textContent.trim());
        expect(studentHeaders).toEqual([
            "Nombre",
            "Usuario",
            "Estado",
            "Nota final",
        ]);

        expect(
            within(screen.getByRole("table", { name: "Estudiantes" })).getByText(
                "Ana Pez"
            )
        ).toBeInTheDocument();
        expect(screen.getByText("90%")).toBeInTheDocument();
        expect(screen.getByText("Aprobado")).toBeInTheDocument();
        expect(
            within(screen.getByRole("table", { name: "Tareas" })).getByText(
                "TP1"
            )
        ).toBeInTheDocument();
        expect(screen.getByText("9")).toBeInTheDocument();
    });

    it("en móvil renderiza las 3 tablas como cards", () => {
        mockMedia(false);
        useSnapshotMock.mockReturnValue({
            snapshot,
            loading: false,
            error: "",
        });

        renderDetail();

        expect(screen.queryAllByRole("table")).toHaveLength(0);

        const studentsList = screen.getByRole("list", {
            name: "Estudiantes",
        });
        const studentCards = within(studentsList).getAllByRole("listitem");
        expect(studentCards).toHaveLength(1);
        expect(
            within(studentCards[0]).getByText("Ana Pez")
        ).toBeInTheDocument();
        expect(
            within(studentCards[0]).getByText("@ana")
        ).toBeInTheDocument();
        expect(
            within(studentCards[0]).getByText("90%")
        ).toBeInTheDocument();

        const assignmentsList = screen.getByRole("list", { name: "Tareas" });
        const assignmentCards = within(assignmentsList).getAllByRole("listitem");
        expect(assignmentCards).toHaveLength(1);
        expect(
            within(assignmentCards[0]).getByText("TP1")
        ).toBeInTheDocument();
        expect(
            within(assignmentCards[0]).getByText("Publicada")
        ).toBeInTheDocument();

        const toggle = within(assignmentsList).getByRole("button", {
            name: /Ver detalles/,
        });
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(
            within(assignmentsList).queryByText("10")
        ).not.toBeInTheDocument();

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(within(assignmentsList).getByText("10")).toBeInTheDocument();

        const gradesList = screen.getByRole("list", { name: "Notas" });
        const gradeCards = within(gradesList).getAllByRole("listitem");
        expect(gradeCards).toHaveLength(1);
        expect(within(gradeCards[0]).getByText("TP1")).toBeInTheDocument();
        expect(within(gradeCards[0]).getByText("9")).toBeInTheDocument();
    });

    it("muestra loading mientras carga", () => {
        useSnapshotMock.mockReturnValue({
            snapshot: null,
            loading: true,
            error: "",
        });

        renderDetail();

        expect(screen.getByText("Cargando snapshot...")).toBeInTheDocument();
    });

    it("muestra error si falla la carga", () => {
        useSnapshotMock.mockReturnValue({
            snapshot: null,
            loading: false,
            error: "Error al cargar",
        });

        renderDetail();

        expect(screen.getByText("Error al cargar")).toBeInTheDocument();
    });
});
