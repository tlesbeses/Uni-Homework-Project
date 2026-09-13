import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";
import { Button } from "@/shared/components/ui/Button";

describe("Button", () => {
    it("renders a button by default with type='button'", () => {
        render(<Button>Click me</Button>);
        const btn = screen.getByRole("button", { name: "Click me" });
        expect(btn.tagName).toBe("BUTTON");
        expect(btn.type).toBe("button");
    });

    it("applies variant and size classes", () => {
        render(
            <Button variant="link" size="sm">
                Link
            </Button>
        );
        const btn = screen.getByRole("button", { name: "Link" });
        expect(btn.className).toContain("text-indigo-600");
        expect(btn.className).toContain("px-3");
        expect(btn.className).toContain("text-xs");
    });

    it("disables and shows spinner when loading", () => {
        render(<Button loading>Save</Button>);
        const btn = screen.getByRole("button", { name: "Save" });
        expect(btn).toBeDisabled();
        expect(btn.querySelector("svg")).toBeInTheDocument();
    });

    it("accepts custom type via rest", () => {
        render(<Button type="submit">Submit</Button>);
        expect(screen.getByRole("button", { name: "Submit" }).type).toBe(
            "submit"
        );
    });

    it("renders as a Link when as={Link}", () => {
        render(
            <MemoryRouter>
                <Button as={Link} to="/admin/errors/1" variant="link" size="sm">
                    Ver detalle
                </Button>
            </MemoryRouter>
        );
        const link = screen.getByRole("link", { name: "Ver detalle" });
        expect(link.tagName).toBe("A");
        expect(link).toHaveAttribute("href", "/admin/errors/1");
        expect(link.className).toContain("text-indigo-600");
    });

    it("renders as an anchor when as='a' with href", () => {
        render(
            <MemoryRouter>
                <Button as="a" href="/about">
                    About
                </Button>
            </MemoryRouter>
        );
        const link = screen.getByRole("link", { name: "About" });
        expect(link.tagName).toBe("A");
        expect(link).toHaveAttribute("href", "/about");
    });

    it("applies aria-disabled and pointer-events-none for disabled links", () => {
        render(
            <MemoryRouter>
                <Button as="a" href="/x" disabled>
                    X
                </Button>
            </MemoryRouter>
        );
        const link = screen.getByRole("link", { name: "X" });
        expect(link).toHaveAttribute("aria-disabled", "true");
        expect(link.className).toContain("pointer-events-none");
    });

    it("fires onClick when not disabled", () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick}>Go</Button>);
        fireEvent.click(screen.getByRole("button", { name: "Go" }));
        expect(onClick).toHaveBeenCalledOnce();
    });
});