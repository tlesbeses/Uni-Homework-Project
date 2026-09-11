import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CourseCard } from "@/features/courses/components/CourseCard";

const baseCourse = {
    id: 1,
    title: "Math 101",
    visibility: "PUBLIC",
    is_active: true,
    enrollments_count: 3,
    teacher: { id: 9, first_name: "Ana", last_name: "López" },
};

function renderCard(course, overrides = {}) {
    return render(
        <MemoryRouter>
            <CourseCard
                course={{ ...baseCourse, ...course }}
                isTeacher={false}
                isStudent={false}
                onDelete={vi.fn()}
                onEdit={vi.fn()}
                onEnroll={vi.fn()}
                onToggleActive={vi.fn()}
                deleting={false}
                togglingActive={false}
                {...overrides}
            />
        </MemoryRouter>
    );
}

function openMenu() {
    fireEvent.click(screen.getByRole("button", { name: "Opciones" }));
}

describe("CourseCard", () => {
    it("muestra la insignia Archivado cuando el curso no está activo", () => {
        renderCard({ is_active: false });

        expect(screen.getByText("Archivado")).toBeInTheDocument();
    });

    it("no muestra la insignia Archivado cuando el curso está activo", () => {
        renderCard({ is_active: true });

        expect(screen.queryByText("Archivado")).not.toBeInTheDocument();
    });

    it("para un curso archivado el menú del profesor ofrece Restaurar", () => {
        const onToggleActive = vi.fn();
        const course = { is_active: false, title: "Math 101" };
        renderCard(course, { isTeacher: true, onToggleActive });

        openMenu();
        fireEvent.click(screen.getByRole("menuitem", { name: "Restaurar" }));

        expect(onToggleActive).toHaveBeenCalledWith(
            expect.objectContaining({ is_active: false })
        );
    });

    it("para un curso activo el menú del profesor ofrece Archivar", () => {
        const course = { is_active: true, title: "Math 101" };
        renderCard(course, { isTeacher: true });

        openMenu();

        expect(
            screen.getByRole("menuitem", { name: "Archivar" })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("menuitem", { name: "Restaurar" })
        ).not.toBeInTheDocument();
    });
});