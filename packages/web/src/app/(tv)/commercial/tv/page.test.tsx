import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CommercialTvPage from "@/app/(tv)/commercial/tv/page";

const access = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/access-context", () => ({ requireAccess: access }));
vi.mock("@/lib/commercial-data", () => ({ getCommercialData: vi.fn(async () => ({ opportunities: [], events: [], interactions: [], clients: [], products: [], managers: [], contacts: [], clientProducts: [], clientProductOwners: [] })) }));
vi.mock("@/components/tv/tv-header-clock", () => ({ TvHeaderClock: () => <div>Relógio</div> }));

afterEach(cleanup);

describe("CommercialTvPage", () => {
  it("protege a rota, aplica tema claro e permite alternância à visão transversal", async () => {
    access.mockResolvedValue({ userId: "u1", role: "executivo", businessArea: "customer_success", managerIds: [] });
    const { container } = render(await CommercialTvPage({ searchParams: Promise.resolve({ theme: "light" }) }));
    expect(access).toHaveBeenCalledWith("commercial");
    expect(container.firstElementChild?.classList.contains("tv-theme-light")).toBe(true);
    expect(screen.getByRole("link", { name: /TV Customer Success/i }).getAttribute("href")).toBe("/tv");
    expect(screen.getByRole("link", { name: "Tema claro" }).getAttribute("href")).toBe("/commercial/tv?theme=light");
  });

  it("não oferece a TV de CS ao usuário somente Comercial", async () => {
    access.mockResolvedValue({ userId: "u2", role: "analista", businessArea: "commercial", managerIds: ["m2"] });
    render(await CommercialTvPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByRole("link", { name: /TV Customer Success/i })).toBeNull();
  });
});
