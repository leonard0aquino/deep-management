import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "@/components/layout/app-sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/my-day" }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock("@/app/login/actions", () => ({ logout: vi.fn() }));

afterEach(cleanup);

describe("AppSidebar", () => {
  it("apresenta Meu dia como primeira área e identifica a rota ativa", () => {
    render(<AppSidebar userEmail="ana@aisphere.com" userName="Ana Silva" userRole="analista" />);

    const links = screen.getAllByRole("link");
    expect(links[0].textContent).toContain("Meu dia");
    expect(links[0].getAttribute("href")).toBe("/my-day");
    expect(links[0].getAttribute("class")).toContain("bg-slate-950");
    expect(links[1].textContent).toContain("Cockpit Executivo");
    expect(screen.getByRole("link", { name: "Relatório" }).getAttribute("href")).toBe("/reports/executive");
  });
});
