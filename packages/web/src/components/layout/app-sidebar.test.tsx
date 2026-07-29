import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "@/components/layout/app-sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/my-day" }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock("@/app/login/actions", () => ({ logout: vi.fn() }));

afterEach(cleanup);

describe("AppSidebar", () => {
  it("apresenta Meu dia como primeira área e oculta visões administrativas para analista", () => {
    render(<AppSidebar userEmail="ana@aisphere.com" userName="Ana Silva" userRole="analista" />);

    const links = screen.getAllByRole("link");
    expect(links[0].textContent).toContain("Meu dia");
    expect(links[0].getAttribute("href")).toBe("/my-day");
    expect(links[0].getAttribute("class")).toContain("bg-slate-950");
    expect(links[1].textContent).toContain("Cockpit Executivo");
    expect(screen.queryByRole("link", { name: "Gestão" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Relatório" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Metas" })).toBeNull();
  });

  it("oculta visões administrativas para gerente", () => {
    render(<AppSidebar userEmail="gerente@aisphere.com" userName="Gerente" userRole="gerente" />);

    expect(screen.queryByRole("link", { name: "Gestão" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Relatório" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Metas" })).toBeNull();
  });

  it("mantém as três visões disponíveis para admin", () => {
    render(<AppSidebar userEmail="admin@aisphere.com" userName="Admin" userRole="admin" />);

    expect(screen.getByRole("link", { name: "Gestão" }).getAttribute("href")).toBe("/analytics");
    expect(screen.getByRole("link", { name: "Relatório" }).getAttribute("href")).toBe("/reports/executive");
    expect(screen.getByRole("link", { name: "Metas" }).getAttribute("href")).toBe("/goals");
  });
});
