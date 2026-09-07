import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseDetailHeader } from "@/features/courses/components/CourseDetailHeader";
import { EnrollmentSection } from "@/features/courses/components/EnrollmentSection";

const { enrollmentsMock } = vi.hoisted(() => ({
    enrollmentsMock: {
        getSections: vi.fn(),
    },
}));

const { useEnrollmentsMock, useEnrollmentMock } = vi.hoisted(() => ({
    useEnrollmentsMock: vi.fn(),
    useEnrollmentMock: vi.fn(),
}));

vi.mock("@/features/courses/services/courseService", () => enrollmentsMock);
vi.mock("@/features/courses/hooks/useEnrollments", () => ({
    useEnrollments: useEnrollmentsMock,
}));
vi.mock("@/features/courses/hooks/useEnrollment", () => ({
    useEnrollment: useEnrollmentMock,
}));

const baseCourse = {
    id: 1,
    title: "Math 101",
    visibility: "PUBLIC",
    enrollments_count: 3,
    teacher: { id: 9, first_name: "Ana", last_name: "López" },
};

function stubEnrollmentHooks() {
    useEnrollmentsMock.mockReturnValue({
        enrollments: [],
        loading: false,
        error: null,
        reload: vi.fn(),
        approveEnrollment: vi.fn(),
        rejectEnrollment: vi.fn(),
        updatingEnrollmentId: null,
    });
    useEnrollmentMock.mockReturnValue({
        enroll: vi.fn(),
        enrolling: false,
    });
}

function renderEnrollmentSection(course) {
    return render(
        <EnrollmentSection
            courseId={course.id}
            teacher={false}
            course={course}
            reloadCourse={vi.fn()}
        />
    );
}

describe("EnrollmentSection — curso archivado", () => {
    beforeEach(() => {
        stubEnrollmentHooks();
        enrollmentsMock.getSections.mockReset();
    });

    it("con curso archivado no ofrece inscripción y avisa que está archivado", () => {
        enrollmentsMock.getSections.mockRejectedValue(new Error("no fetch"));
        renderEnrollmentSection({
            ...baseCourse,
            is_active: false,
        });

        expect(
            screen.getByText(
                "Este curso está archivado y no acepta nuevas inscripciones."
            )
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Inscribirme" })
        ).not.toBeInTheDocument();
        expect(enrollmentsMock.getSections).not.toHaveBeenCalled();
    });

    it("con curso activo y secciones disponibles ofrece el botón Inscribirme", async () => {
        enrollmentsMock.getSections.mockResolvedValue({
            results: [{ id: 2, name: "1TS1" }],
        });
        renderEnrollmentSection({
            ...baseCourse,
            is_active: true,
        });

        expect(
            await screen.findByRole("button", { name: "Inscribirme" })
        ).toBeInTheDocument();
    });
});

describe("CourseDetailHeader — insignia Archivado", () => {
    it("muestra la insignia cuando el curso está archivado", () => {
        render(
            <CourseDetailHeader
                course={{ ...baseCourse, is_active: false }}
                teacher={false}
                isOwner={false}
                onEdit={vi.fn()}
            />
        );

        expect(screen.getByText("Archivado")).toBeInTheDocument();
    });

    it("no muestra la insignia cuando el curso está activo", () => {
        render(
            <CourseDetailHeader
                course={{ ...baseCourse, is_active: true }}
                teacher={false}
                isOwner={false}
                onEdit={vi.fn()}
            />
        );

        expect(screen.queryByText("Archivado")).not.toBeInTheDocument();
    });
});