import { describe, expect, it } from "vitest";
import type { CommercialAgendaEntry, CommercialCockpitState } from "@/lib/types/database";
import { buildCommercialDashboard, commercialDaysSince } from "@/services/commercial-dashboard";

const allStages = ["prospecting", "meetings", "nda_poc", "won"] as const;
const user = (id: string, name: string) => ({ id, name, stages: [...allStages] });

const state: CommercialCockpitState = {
  id: "s1",
  owner_user_id: "u1",
  prospecting_count: 48,
  meetings_count: 23,
  nda_poc_count: 12,
  won_count: 7,
  last_meeting_on: "2026-08-02",
  last_nda_poc_on: "2026-07-29",
  last_proposal_on: "2026-07-21",
  last_won_on: "2026-07-26",
  created_by: "u1",
  updated_by: "u1",
  created_at: "2026-08-01T12:00:00Z",
  updated_at: "2026-08-04T12:00:00Z",
};

const agendaEntry = (overrides: Partial<CommercialAgendaEntry> = {}): CommercialAgendaEntry => ({
  id: "a1",
  owner_user_id: "u1",
  company_name: "Acme",
  title: "Reunião de descoberta",
  kind: "meeting",
  scheduled_at: "2026-08-05T13:00:00Z",
  status: "scheduled",
  completed_at: null,
  created_by: "u1",
  updated_by: "u1",
  created_at: "2026-08-01T12:00:00Z",
  updated_at: "2026-08-04T13:00:00Z",
  ...overrides,
});

describe("dashboard Comercial manual", () => {
  it("calcula recência por dia civil de São Paulo e ignora datas futuras", () => {
    const summary = buildCommercialDashboard({
      states: [state, { ...state, id: "s2", owner_user_id: "u2", last_meeting_on: "2026-08-06" }],
      agendaEntries: [],
      users: [user("u1", "Marina"), user("u2", "Gabriel")],
      referenceAt: "2026-08-05T15:00:00Z",
    });

    expect(summary.kpis.map((item) => item.days)).toEqual([3, 7, 15, 10]);
    expect(commercialDaysSince("2026-08-04T23:30:00-03:00", "2026-08-05T00:30:00-03:00")).toBe(1);
  });

  it("consolida o funil manual em quatro etapas e calcula conversão", () => {
    const summary = buildCommercialDashboard({ states: [state], agendaEntries: [], users: [user("u1", "Marina")], referenceAt: "2026-08-05T15:00:00Z" });

    expect(summary.funnel.map(({ label, count }) => [label, count])).toEqual([
      ["Prospecção", 48],
      ["Reuniões agendadas", 23],
      ["NDA / POC", 12],
      ["Vendas fechadas", 7],
    ]);
    expect(summary.funnel.map((item) => item.conversion)).toEqual([null, 47.9, 52.2, 58.3]);
  });

  it("mantém apenas a agenda pendente, ordena por data e sinaliza atrasos", () => {
    const summary = buildCommercialDashboard({
      states: [state],
      agendaEntries: [
        agendaEntry({ id: "future", scheduled_at: "2026-08-06T13:00:00Z" }),
        agendaEntry({ id: "past", scheduled_at: "2026-08-04T13:00:00Z" }),
        agendaEntry({ id: "done", status: "completed", completed_at: "2026-08-03T13:00:00Z" }),
      ],
      users: [user("u1", "Marina")],
      referenceAt: "2026-08-05T15:00:00Z",
    });

    expect(summary.agenda.map((item) => item.id)).toEqual(["past", "future"]);
    expect(summary.overdue.map((item) => item.id)).toEqual(["past"]);
    expect(summary.updatedBy).toBe("Marina");
  });

  it("não inventa conversão quando a etapa anterior está zerada", () => {
    const empty = { ...state, prospecting_count: 0, meetings_count: 0, nda_poc_count: 0, won_count: 0 };
    const summary = buildCommercialDashboard({ states: [empty], agendaEntries: [], users: [user("u1", "Marina")], referenceAt: "2026-08-05T15:00:00Z" });
    expect(summary.funnel.map((item) => item.conversion)).toEqual([null, null, null, null]);
  });

  it("consolida somente as etapas atribuídas a cada responsável", () => {
    const summary = buildCommercialDashboard({
      states: [
        state,
        { ...state, id: "s2", owner_user_id: "u2", prospecting_count: 99, meetings_count: 88, nda_poc_count: 5, won_count: 4 },
      ],
      agendaEntries: [
        agendaEntry({ id: "meeting-u1", owner_user_id: "u1", kind: "meeting" }),
        agendaEntry({ id: "nda-u1", owner_user_id: "u1", kind: "nda_poc" }),
        agendaEntry({ id: "nda-u2", owner_user_id: "u2", kind: "nda_poc" }),
      ],
      users: [
        { id: "u1", name: "Letícia", stages: ["prospecting", "meetings"] },
        { id: "u2", name: "Tinoco", stages: ["nda_poc"] },
      ],
      referenceAt: "2026-08-05T15:00:00Z",
    });

    expect(summary.funnel.map(({ key, count }) => [key, count])).toEqual([
      ["prospecting", 48],
      ["meetings", 23],
      ["nda_poc", 5],
    ]);
    expect(summary.funnel.map((item) => item.conversion)).toEqual([null, 47.9, 21.7]);
    expect(summary.kpis.map((item) => item.key)).toEqual(["meeting", "nda_poc", "proposal"]);
    expect(summary.agenda.map((item) => item.id)).toEqual(["meeting-u1", "nda-u2"]);
  });

  it("não exibe etapas nem inventa conversões para usuário sem atribuição", () => {
    const summary = buildCommercialDashboard({
      states: [state], agendaEntries: [agendaEntry()], users: [{ id: "u1", name: "Sem escopo", stages: [] }], referenceAt: "2026-08-05T15:00:00Z",
    });
    expect(summary.funnel).toEqual([]);
    expect(summary.kpis).toEqual([]);
    expect(summary.agenda).toEqual([]);
  });

  it("não atribui ao escopo atual uma atualização de estado anterior à configuração", () => {
    const summary = buildCommercialDashboard({
      states: [state],
      agendaEntries: [],
      users: [{
        id: "u1",
        name: "Letícia",
        stages: ["prospecting"],
        scopeUpdatedAt: "2026-08-05T10:00:00Z",
      }],
      referenceAt: "2026-08-05T15:00:00Z",
    });

    expect(summary.updatedAt).toBeNull();
    expect(summary.updatedBy).toBeNull();
  });
});
