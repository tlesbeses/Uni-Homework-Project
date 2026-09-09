import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { RouteErrorScreen } from "@/app/router/RouteErrorScreen";

vi.mock("@/shared/utils/reportError", () => ({
    reportErrorFromEvent: vi.fn(() => Promise.resolve("sup-x7y9z")),
}));

const ThrowPage = () => {
    throw new Error("boom de prueba");
};

function renderWithRouteError() {
    const router = createMemoryRouter(
        [
            {
                path: "/",
                element: <ThrowPage />,
                errorElement: <RouteErrorScreen />,
            },
        ],
        { initialEntries: ["/"] }
    );
    return render(<RouterProvider router={router} />);
}

describe("RouteErrorScreen", () => {
    it("muestra la pantalla amigable ante un error de render", () => {
        act(() => {
            renderWithRouteError();
        });
        expect(
            screen.getByRole("heading", { name: "Algo salió mal" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Recargar página" })
        ).toBeInTheDocument();
    });

    it("reporta el error y muestra el código de soporte", async () => {
        const { reportErrorFromEvent } = await import(
            "@/shared/utils/reportError"
        );
        act(() => {
            renderWithRouteError();
        });
        await screen.findByText("sup-x7y9z");
        expect(reportErrorFromEvent).toHaveBeenCalledWith(
            expect.objectContaining({ message: "boom de prueba" }),
            "route"
        );
        expect(screen.getByText("sup-x7y9z")).toBeInTheDocument();
    });
});