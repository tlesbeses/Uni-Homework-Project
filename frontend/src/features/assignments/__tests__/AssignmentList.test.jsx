import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssignmentList } from "@/features/assignments/components/AssignmentList";

vi.mock("@/features/assignments/components/PublishBadge", () => ({
    PublishBadge: () => null,
}));

vi.mock("@/features/assignments/utils/formatDate", () => ({
    formatDateTime: () => "1 jun, 2026 10:00",
}));

const ASSIGNMENT = {
    id: 1,
    title: "Práctica 1",
    description: "Resolver ejercicios del módulo 1",
    max_score: "20",
    is_published: true,
    category: "ACUMULADO",
    parcial: "PRIMERO",
    due_date: "2026-06-01T10:00:00Z",
};

function renderList(props = {}) {
    return render(
        <AssignmentList
            assignments={[ASSIGNMENT]}
            canManage={false}
            {...props}
        />
    );
}

describe("AssignmentList", () => {
    it("oculta la descripción por defecto", () => {
        renderList();
        expect(
            screen.queryByText("Resolver ejercicios del módulo 1")
        ).not.toBeInTheDocument();
        expect(screen.getByText("Práctica 1")).toBeInTheDocument();
    });

    it("muestra la descripción mientras se mantiene presionado", () => {
        renderList();
        fireEvent.pointerDown(screen.getByText("Práctica 1"));
        expect(
            screen.getByText("Resolver ejercicios del módulo 1")
        ).toBeInTheDocument();
        fireEvent.pointerUp(screen.getByText("Práctica 1"));
        expect(
            screen.queryByText("Resolver ejercicios del módulo 1")
        ).not.toBeInTheDocument();
    });

    it("oculta la descripción al salir con el cursor", () => {
        renderList();
        fireEvent.pointerDown(screen.getByText("Práctica 1"));
        fireEvent.pointerLeave(screen.getByText("Práctica 1"));
        expect(
            screen.queryByText("Resolver ejercicios del módulo 1")
        ).not.toBeInTheDocument();
    });
});