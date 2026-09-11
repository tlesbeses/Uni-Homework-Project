import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CourseDetailPage } from "@/features/courses/pages/CourseDetailPage";

const { authMock } = vi.hoisted(() => ({
    authMock: {
        user: { id: 1, username: "ana" },
        isTeacher: false,
    },
}));

const { courseMock } = vi.hoisted(() => ({
    courseMock: {
        course: null,
        loading: false,
        error: "",
        reload: vi.fn(),
        updateCourse: vi.fn(),
    },
}));

const { settingsMock } = vi.hoisted(() => ({
    settingsMock: {
        savingField: null,
        toggleAutoAccept: vi.fn(),
        toggleVisibility: vi.fn(),
        updatePonderacion: vi.fn(),
    },
}));

vi.mock("@/features/auth/providers/AuthProvider", () => ({
    useAuth: () => authMock,
}));
vi.mock("@/features/courses/hooks/useCourse", () => ({
    useCourse: () => courseMock,
}));
vi.mock("@/features/courses/hooks/useCourseSettings", () => ({
    useCourseSettings: () => settingsMock,
}));
vi.mock("@/features/courses/components/CourseProgress", () => ({
    CourseProgress: () => <div data-testid="course-progress" />,
}));
vi.mock("@/features/courses/components/QuickSettingsBar", () => ({
    QuickSettingsBar: () => <div data-testid="quick-settings" />,
}));
vi.mock("@/features/assignments/components/AssignmentSection", () => ({
    AssignmentSection: () => <div data-testid="assignment-section" />,
}));
vi.mock("@/features/courses/components/CourseDetailSidebar", () => ({
    CourseDetailSidebar: () => <div data-testid="course-sidebar" />,
}));
vi.mock("@/features/courses/components/EnrollmentSection", () => ({
    EnrollmentSection: () => <div data-testid="enrollment-section" />,
}));
vi.mock("@/features/courses/components/EditCourseModal", () => ({
    EditCourseModal: () => <div data-testid="edit-course-modal" />,
}));

function renderPage() {
    return render(
        <MemoryRouter initialEntries={["/courses/7"]}>
            <Routes>
                <Route path="/courses/:id" element={<CourseDetailPage />} />
            </Routes>
        </MemoryRouter>
    );
}

const teacherCourse = {
    id: 7,
    title: "Matemáticas I",
    teacher: { id: 1, first_name: "Ana", last_name: "Perez" },
    visibility: "PUBLIC",
    is_active: true,
    join_code: "ABC123",
    description: "Curso de cálculo y álgebra.",
    enrollments_count: 12,
};

describe("CourseDetailPage", () => {
    beforeEach(() => {
        courseMock.course = null;
        courseMock.loading = false;
        courseMock.error = "";
        courseMock.loading = false;
    });

    it("muestra el estado de carga", () => {
        courseMock.loading = true;
        renderPage();

        expect(screen.getByText("Cargando curso...")).toBeInTheDocument();
    });

    it("muestra el error si la API falla", () => {
        courseMock.error = "Error de red";
        renderPage();

        expect(screen.getByText("Error de red")).toBeInTheDocument();
    });

    it("avisa cuando el curso no existe", () => {
        renderPage();

        expect(
            screen.getByText("Curso no encontrado.")
        ).toBeInTheDocument();
    });

    it("muestra el detalle al profesor propietario con las secciones docentes", () => {
        authMock.isTeacher = true;
        courseMock.course = teacherCourse;

        renderPage();

        expect(
            screen.getByRole("heading", { name: "Matemáticas I" })
        ).toBeInTheDocument();
        expect(screen.getByText("Profesor: Ana Perez")).toBeInTheDocument();
        expect(screen.getByText("Código: ABC123")).toBeInTheDocument();
        expect(screen.getByText("12 alumnos inscritos")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
        expect(
            screen.getByTestId("course-progress")
        ).toBeInTheDocument();
        expect(screen.getByTestId("quick-settings")).toBeInTheDocument();
        expect(screen.getByTestId("course-sidebar")).toBeInTheDocument();
        expect(screen.getByTestId("assignment-section")).toBeInTheDocument();
        expect(
            screen.queryByTestId("enrollment-section")
        ).not.toBeInTheDocument();
    });

    it("a un estudiante le muestra la seccion de inscripcion y los trabajos", () => {
        authMock.isTeacher = false;
        courseMock.course = teacherCourse;

        renderPage();

        expect(
            screen.getByRole("heading", { name: "Matemáticas I" })
        ).toBeInTheDocument();
        expect(
            screen.getByTestId("enrollment-section")
        ).toBeInTheDocument();
        expect(screen.getByTestId("assignment-section")).toBeInTheDocument();
        expect(
            screen.queryByTestId("course-progress")
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Editar" })
        ).not.toBeInTheDocument();
    });
});