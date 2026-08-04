import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CommercialTvContent } from "@/components/tv/commercial-tv-content";
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
});
