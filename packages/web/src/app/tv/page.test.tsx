import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TvPage from "@/app/tv/page";

const dashboardData = {
  healthScore: { score: 82, critical_count: 2, tracked_combinations: 10 },
  clientHealth: [],
  matrix: [],
  interactions: [],
  clients: [],
  products: [],
};

vi.mock("@/lib/data", () => ({
  getAuthorizedDashboardData: vi.fn(() => Promise.resolve(dashboardData)),
}));

vi.mock("@/lib/auth/access-context", () => ({
  requireAccess: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/components/tv/tv-header-clock", () => ({
  TvHeaderClock: () => <div>Relógio</div>,
}));

afterEach(cleanup);

describe("TvPage", () => {
  it("usa o tema escuro como padrão e mantém o conteúdo completo", async () => {
    const { container } = render(await TvPage({ searchParams: Promise.resolve({}) }));

    expect(container.firstElementChild?.classList.contains("tv-theme-dark")).toBe(true);
    expect(screen.getByRole("heading", { name: "Mapa de calor — Cliente × Produto" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Últimas atividades" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Escura" }).getAttribute("aria-current")).toBe("page");
  });

  it("aplica o tema claro sem remover conteúdo", async () => {
    const { container } = render(
      await TvPage({ searchParams: Promise.resolve({ theme: "light" }) }),
    );

    expect(container.firstElementChild?.classList.contains("tv-theme-light")).toBe(true);
    expect(screen.getByRole("heading", { name: "Mapa de calor — Cliente × Produto" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Últimas atividades" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Clara" }).getAttribute("aria-current")).toBe("page");
  });
});
