import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TvDashboardContent } from "@/components/tv/tv-dashboard-content";
import type { PriorityAction } from "@/services/priority-actions";

afterEach(cleanup);

function priority(index: number): PriorityAction {
  return {
    key: `priority-${index}`,
    clientId: `client-${index}`,
    clientName: `Cliente ${index}`,
    productId: `product-${index}`,
    productName: `Produto ${index}`,
    priority: index < 4 ? "alta" : "media",
    reason: `Motivo ${index}`,
    managerName: null,
    dueAt: "2026-08-02T12:00:00.000Z",
    daysSinceContact: index,
    score: 50 - index,
  };
}

const actions = Array.from({ length: 6 }, (_, index) => priority(index + 1));

describe("TvDashboardContent", () => {
  it("preserva todos os blocos e as seis prioridades independentemente do tema", () => {
    render(
      <TvDashboardContent
        clients={[]}
        products={[]}
        matrix={[]}
        interactions={[]}
        actions={actions}
        spotlightItems={[]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Mapa de calor — Cliente × Produto" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Últimas atividades" })).toBeTruthy();
    expect(screen.getByText("Cliente 6 · Produto 6")).toBeTruthy();
  });
});
