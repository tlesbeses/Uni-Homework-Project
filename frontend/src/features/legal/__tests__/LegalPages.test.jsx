import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TermsPage } from "@/features/legal/pages/TermsPage";
import { PrivacyPage } from "@/features/legal/pages/PrivacyPage";

function renderPage(ui) {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
}

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
