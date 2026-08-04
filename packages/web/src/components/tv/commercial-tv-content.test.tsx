import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CommercialTvContent } from "@/components/tv/commercial-tv-content";
import type { CommercialOpportunity } from "@/lib/types/database";
import { buildCommercialDashboard } from "@/services/commercial-dashboard";

afterEach(cleanup);

describe("CommercialTvContent", () => {
  it("mantém KPIs, funil e estado vazio sem expor notas de interação", () => {
    const summary = buildCommercialDashboard({ opportunities: [], events: [], interactions: [], filters: { periodDays: null }, referenceAt: "2026-08-04T15:00:00Z" });
    render(<CommercialTvContent summary={summary} clients={[]} managers={[]} referenceAt="2026-08-04T15:00:00Z" />);
    expect(screen.getByText("Dias sem nova reunião")).toBeTruthy();
    expect(screen.getByText("Funil de vendas")).toBeTruthy();
    expect(screen.getByText("Nenhum compromisso Comercial agendado.")).toBeTruthy();
    expect(screen.queryByText("Notas confidenciais")).toBeNull();
  });

  it("apresenta o funil em uma coluna com a mesma hierarquia da tela Comercial", () => {
    const opportunity: CommercialOpportunity = {
      id: "o1",
      client_id: "c1",
      contact_id: null,
      product_id: null,
      owner_manager_id: "m1",
      name: "Nova conta",
      stage: "prospecting",
      amount: 1_000,
      probability: 50,
      next_step: null,
      next_step_at: null,
      closed_at: null,
      loss_reason: null,
      created_by: "u1",
      updated_by: "u1",
      created_at: "2026-08-04T10:00:00Z",
      updated_at: "2026-08-04T10:00:00Z",
    };
    const summary = buildCommercialDashboard({ opportunities: [opportunity], events: [], interactions: [], filters: { periodDays: null }, referenceAt: "2026-08-04T15:00:00Z" });

    render(<CommercialTvContent summary={summary} clients={[]} managers={[]} referenceAt="2026-08-04T15:00:00Z" />);

    expect(screen.getByTestId("commercial-tv-funnel").className).toContain("space-y-2");
    expect(screen.getByText("R$ 500 ponderado")).toBeTruthy();
    expect(screen.getByText("R$ 1.000")).toBeTruthy();
  });
});
