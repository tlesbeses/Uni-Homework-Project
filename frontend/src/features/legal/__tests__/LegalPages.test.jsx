import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { TermsPage } from "@/features/legal/pages/TermsPage";
import { PrivacyPage } from "@/features/legal/pages/PrivacyPage";

function renderPage(ui) {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/** Simula la presencia (o ausencia) de window.opener en jsdom. */
function setOpener(value) {
    Object.defineProperty(window, "opener", {
        value,
        configurable: true,
        writable: true,
    });
}

/** Muestra la ruta actual del router, para assertions de navegación. */
const LocationDisplay = () => {
    const location = useLocation();
    return <div data-testid="location">{location.pathname}</div>;
};

describe("páginas legales", () => {
    it("la página de términos muestra el título y la versión", () => {
        renderPage(<TermsPage />);

        expect(
            screen.getByRole("heading", { level: 1, name: "Términos y Condiciones" })
        ).toBeInTheDocument();
        expect(screen.getByText(/Versión 1\.1/)).toBeInTheDocument();
    });

    it("la política de privacidad describe las cookies necesarias", () => {
        renderPage(<PrivacyPage />);

        expect(
            screen.getByRole("heading", { level: 1, name: "Política de Privacidad" })
        ).toBeInTheDocument();
        expect(screen.getByText(/refresh_token/)).toBeInTheDocument();
        expect(screen.getByText(/csrftoken/)).toBeInTheDocument();
    });

    it("la página de términos enlaza a la política de privacidad", () => {
        renderPage(<TermsPage />);

        const links = screen.getAllByRole("link", {
            name: "Política de Privacidad",
        });
        expect(links.length).toBeGreaterThan(0);
        links.forEach((link) => {
            expect(link).toHaveAttribute("href", "/privacy");
        });
    });

    it("los términos cubren el cierre de cuentas", () => {
        renderPage(<TermsPage />);

        expect(
            screen.getByRole("heading", {
                name: "8. Suspensión y cierre de cuentas",
            })
        ).toBeInTheDocument();
    });

    it("la política de privacidad cubre proveedores, desactivación y seguridad", () => {
        renderPage(<PrivacyPage />);

        expect(
            screen.getByRole("heading", { name: "5. Proveedores y transferencias" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: "7. Eliminación y desactivación" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: "10. Seguridad" })
        ).toBeInTheDocument();
    });
});

describe("botón Volver de los documentos legales", () => {
    afterEach(() => {
        setOpener(null);
        vi.restoreAllMocks();
    });

    it("cierra la pestaña y devuelve el foco cuando se abrió desde la app", async () => {
        const focus = vi.fn();
        setOpener({ focus, closed: false });
        const closeSpy = vi.spyOn(window, "close").mockImplementation(() => {});
        const user = userEvent.setup();

        renderPage(<TermsPage />);

        await user.click(screen.getByRole("button", { name: /volver/i }));

        expect(closeSpy).toHaveBeenCalledTimes(1);
        expect(focus).toHaveBeenCalledTimes(1);
        expect(
            screen.queryByRole("link", { name: /volver al inicio/i })
        ).not.toBeInTheDocument();
    });

    it("muestra el enlace al inicio en visitas directas (sin opener)", () => {
        setOpener(null);

        renderPage(<PrivacyPage />);

        const link = screen.getByRole("link", { name: /volver al inicio/i });
        expect(link).toHaveAttribute("href", "/");
        expect(
            screen.queryByRole("button", { name: /volver/i })
        ).not.toBeInTheDocument();
    });

    it("navega al inicio si el navegador bloquea el cierre", async () => {
        setOpener({ focus: vi.fn(), closed: false });
        // close() sin efecto: window.closed sigue en false, como cuando el
        // navegador bloquea el cierre de la pestaña.
        vi.spyOn(window, "close").mockImplementation(() => {});
        const user = userEvent.setup();

        render(
            <MemoryRouter initialEntries={["/terms"]}>
                <LocationDisplay />
                <TermsPage />
            </MemoryRouter>
        );

        await user.click(screen.getByRole("button", { name: /volver/i }));

        expect(await screen.findByTestId("location")).toHaveTextContent("/");
    });
});
