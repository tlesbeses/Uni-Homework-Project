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
        expect(screen.getByText(/Versión 1\.0/)).toBeInTheDocument();
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

        expect(
            screen.getByRole("link", { name: "Política de Privacidad" })
        ).toHaveAttribute("href", "/privacy");
    });
});
