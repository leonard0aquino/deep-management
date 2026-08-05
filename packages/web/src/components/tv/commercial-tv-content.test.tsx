import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CommercialTvContent } from "@/components/tv/commercial-tv-content";
import type { CommercialCockpitState } from "@/lib/types/database";
import { buildCommercialDashboard } from "@/services/commercial-dashboard";

afterEach(cleanup);

describe("CommercialTvContent", () => {
  it("apresenta a mesma fonte manual, os quatro indicadores e o funil simplificado", () => {
    const state: CommercialCockpitState = {
      id: "s1", owner_user_id: "u1", prospecting_count: 48, meetings_count: 23, nda_poc_count: 12, won_count: 7,
      last_meeting_on: "2026-08-02", last_nda_poc_on: "2026-07-29", last_proposal_on: "2026-07-21", last_won_on: "2026-07-26",
      created_by: "u1", updated_by: "u1", created_at: "2026-08-01T12:00:00Z", updated_at: "2026-08-04T12:00:00Z",
    };
    const users = [{ id: "u1", name: "Marina", stages: ["prospecting", "meetings", "nda_poc", "won"] as const }];
    const summary = buildCommercialDashboard({ states: [state], agendaEntries: [], users: users.map((user) => ({ ...user, stages: [...user.stages] })), referenceAt: "2026-08-05T15:00:00Z" });

    render(<CommercialTvContent summary={summary} users={users.map((user) => ({ ...user, stages: [...user.stages] }))} referenceAt="2026-08-05T15:00:00Z" />);

    expect(screen.getByText("Painel Gerencial")).toBeTruthy();
    expect(screen.getByText("Dias sem nova reunião")).toBeTruthy();
    expect(screen.getByText("Prospecção")).toBeTruthy();
    expect(screen.getByText("Reuniões agendadas")).toBeTruthy();
    expect(screen.getByText("NDA / POC")).toBeTruthy();
    expect(screen.getByText("Vendas fechadas")).toBeTruthy();
    expect(screen.getByTestId("commercial-tv-funnel").className).toContain("space-y-2");
    expect(screen.getByText("Nenhum compromisso Comercial agendado.")).toBeTruthy();
    expect(screen.queryByText("Notas confidenciais")).toBeNull();
  });
});
