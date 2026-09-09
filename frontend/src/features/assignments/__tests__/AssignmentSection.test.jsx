import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AssignmentSection } from "@/features/assignments/components/AssignmentSection";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => navigateMock };
});

const { useAssignmentsMock } = vi.hoisted(() => ({
    useAssignmentsMock: vi.fn(),
}));

vi.mock("@/features/assignments/hooks/useAssignments", () => ({
    useAssignments: useAssignmentsMock,
}));

vi.mock("@/features/assignments/hooks/useAssignmentMutations", () => ({
    useDeleteAssignment: () => ({ mutateAsync: vi.fn() }),
    useToggleAssignmentPublish: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/features/assignments/components/AssignmentList", () => ({
    AssignmentList: () => null,
}));

vi.mock("@/features/assignments/components/CreateAssignmentModal", () => ({
    CreateAssignmentModal: () => null,
}));

vi.mock("@/features/assignments/components/EditAssignmentModal", () => ({
    EditAssignmentModal: () => null,
}));

vi.mock("@/shared/components/ConfirmModal", () => ({
    ConfirmModal: () => null,
}));

vi.mock("@/shared/components/Pager", () => ({
    Pager: () => null,
}));

vi.mock("@/shared/components/SearchInput", () => ({
    SearchInput: () => null,
}));

function renderSection(props = {}) {
    return render(
        <MemoryRouter>
            <AssignmentSection
                courseId="1"
                isTeacher
                isOwner
                selectedSectionId="2"
                {...props}
            />
        </MemoryRouter>
    );
}

beforeEach(() => {
    navigateMock.mockClear();
    useAssignmentsMock.mockReturnValue({
        assignments: [],
        loading: false,
        error: null,
        reload: vi.fn(),
    });
});

describe("AssignmentSection", () => {
    it("renders Ver reporte button for teachers and navigates with course + section", () => {
        renderSection();
        const btn = screen.getByText("Ver reporte");
        expect(btn).toBeInTheDocument();

        fireEvent.click(btn);
        expect(navigateMock).toHaveBeenCalledWith(
            "/grades/report?course=1&section=2"
        );
    });

    it("hides Ver reporte when user is not the course owner", () => {
        renderSection({ isOwner: false });
        expect(screen.queryByText("Ver reporte")).not.toBeInTheDocument();
    });

    it("navigates to report without section when none is selected", () => {
        renderSection({ selectedSectionId: "" });
        fireEvent.click(screen.getByText("Ver reporte"));
        expect(navigateMock).toHaveBeenCalledWith("/grades/report?course=1");
    });
});
