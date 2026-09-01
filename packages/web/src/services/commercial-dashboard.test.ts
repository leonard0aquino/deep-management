import { describe, expect, it } from "vitest";
import type { CommercialAgendaEntry, CommercialCockpitState, CommercialDailyProspecting, CommercialOpportunity, CommercialOpportunityStageEvent } from "@/lib/types/database";
import { buildCommercialDashboard, buildCommercialFunnelCompanies, buildDailyProspectingChart, commercialDaysSince } from "@/services/commercial-dashboard";

const allStages = ["prospecting", "meetings", "nda_poc", "awaiting_signature", "won"] as const;
const user = (id: string, name: string) => ({ id, name, role: "analista" as const, stages: [...allStages] });

const state: CommercialCockpitState = {
  id: "s1",
  owner_user_id: "u1",
  prospecting_count: 48,
  meetings_count: 23,
  nda_poc_count: 12,
  awaiting_signature_count: 3,
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

const dailyEntry = (overrides: Partial<CommercialDailyProspecting> = {}): CommercialDailyProspecting => ({
  id: "d1",
  owner_user_id: "u1",
  activity_on: "2026-08-05",
  prospecting_count: 4,
  created_by: "u1",
  updated_by: "u1",
  created_at: "2026-08-05T12:00:00Z",
  updated_at: "2026-08-05T12:00:00Z",
  ...overrides,
});

describe("dashboard Comercial manual", () => {
  it("monta 14 dias de prospecção com séries apenas para analistas elegíveis", () => {
    const chart = buildDailyProspectingChart({
      entries: [
        dailyEntry(),
        dailyEntry({ id: "d2", owner_user_id: "u2", activity_on: "2026-08-04", prospecting_count: 7 }),
        dailyEntry({ id: "d3", owner_user_id: "u3", prospecting_count: 99 }),
      ],
      users: [
        { id: "u1", name: "Thiago Castro", role: "analista", stages: ["prospecting"] },
        { id: "u2", name: "Leticia Machado", role: "analista", stages: ["prospecting"] },
        { id: "u3", name: "Gestor", role: "gerente", stages: ["prospecting"] },
        { id: "u4", name: "Sem etapa", role: "analista", stages: ["meetings"] },
      ],
      referenceAt: "2026-08-05T02:30:00Z",
    });

    expect(chart.series.map((item) => item.name)).toEqual(["Thiago Castro", "Leticia Machado"]);
    expect(chart.days).toHaveLength(14);
    expect(chart.days[0]?.date).toBe("2026-07-22");
    expect(chart.days.at(-1)).toEqual({
      date: "2026-08-04",
      label: "04/08",
      counts: { u1: 0, u2: 7 },
    });
  });

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

  it("consolida o funil manual em cinco etapas e calcula conversão", () => {
    const summary = buildCommercialDashboard({
      states: [state],
      agendaEntries: [
        agendaEntry({ id: "meeting-1" }),
        agendaEntry({ id: "meeting-2", scheduled_at: "2026-08-06T13:00:00Z" }),
        agendaEntry({ id: "meeting-completed", status: "completed" }),
        agendaEntry({ id: "meeting-cancelled", status: "cancelled" }),
        agendaEntry({ id: "proposal", kind: "proposal" }),
      ],
      users: [user("u1", "Marina")],
      referenceAt: "2026-08-05T15:00:00Z",
    });

    expect(summary.funnel.map(({ label, count }) => [label, count])).toEqual([
      ["Prospecção", 48],
      ["Reuniões agendadas", 2],
      ["NDA / POC", 12],
      ["Chamado aguardando assinatura", 3],
      ["Vendas fechadas", 7],
    ]);
    expect(summary.funnel.map((item) => item.conversion)).toEqual([null, 4.2, 600, 25, 233.3]);
  });

  it("agrupa empresas por etapa e calcula a permanência pelo último evento de entrada", () => {
    const opportunity: CommercialOpportunity = {
      id: "op1", client_id: "client1", contact_id: null, product_id: null, owner_manager_id: null,
      name: "Fallback", stage: "awaiting_signature", amount: 0, probability: 80, next_step: null,
      next_step_at: null, closed_at: null, loss_reason: null, created_by: "u1", updated_by: "u1",
      created_at: "2026-08-01T12:00:00Z", updated_at: "2026-08-08T12:00:00Z",
    };
    const events: CommercialOpportunityStageEvent[] = [
      { id: "e1", opportunity_id: "op1", from_stage: "negotiation", to_stage: "awaiting_signature", actor_id: "u1", created_at: "2026-08-07T21:00:00Z" },
      { id: "e2", opportunity_id: "op1", from_stage: "proposal", to_stage: "negotiation", actor_id: "u1", created_at: "2026-08-05T12:00:00Z" },
    ];

    const grouped = buildCommercialFunnelCompanies({
      opportunities: [opportunity],
      clients: [{ id: "client1", name: "Empresa Aurora" }],
      events,
      referenceAt: "2026-08-11T15:00:00Z",
    });

    expect(grouped.awaiting_signature).toEqual([expect.objectContaining({ companyName: "Empresa Aurora", daysInStage: 4, enteredAt: "2026-08-07T21:00:00Z" })]);
  });

  it("oculta reuniões já realizadas da agenda sem removê-las do contador", () => {
    const summary = buildCommercialDashboard({
      states: [state],
      agendaEntries: [
        agendaEntry({ id: "future", scheduled_at: "2026-08-06T13:00:00Z" }),
        agendaEntry({ id: "past", scheduled_at: "2026-08-04T13:00:00Z" }),
        agendaEntry({ id: "past-proposal", kind: "proposal", scheduled_at: "2026-08-04T14:00:00Z" }),
        agendaEntry({ id: "done", status: "completed", completed_at: "2026-08-03T13:00:00Z" }),
      ],
      users: [user("u1", "Marina")],
      referenceAt: "2026-08-05T15:00:00Z",
    });

    expect(summary.funnel.find((item) => item.key === "meetings")?.count).toBe(2);
    expect(summary.funnel.find((item) => item.key === "meetings")?.companies.map((item) => item.companyName)).toEqual(["Acme", "Acme"]);
    expect(summary.funnel.find((item) => item.key === "meetings")?.unlinkedCount).toBe(0);
    expect(summary.agenda.map((item) => item.id)).toEqual(["past-proposal", "future"]);
    expect(summary.overdue.map((item) => item.id)).toEqual(["past-proposal"]);
    expect(summary.updatedBy).toBe("Marina");
  });

  it("não inventa conversão quando a etapa anterior está zerada", () => {
    const empty = { ...state, prospecting_count: 0, meetings_count: 0, nda_poc_count: 0, awaiting_signature_count: 0, won_count: 0 };
    const summary = buildCommercialDashboard({ states: [empty], agendaEntries: [], users: [user("u1", "Marina")], referenceAt: "2026-08-05T15:00:00Z" });
    expect(summary.funnel.map((item) => item.conversion)).toEqual([null, null, null, null, null]);
  });

  it("consolida somente as etapas atribuídas a cada responsável", () => {
    const summary = buildCommercialDashboard({
      states: [
        state,
        { ...state, id: "s2", owner_user_id: "u2", prospecting_count: 99, meetings_count: 88, nda_poc_count: 5, won_count: 4 },
      ],
      agendaEntries: [
        agendaEntry({ id: "meeting-u1", owner_user_id: "u1", kind: "meeting", scheduled_at: "2026-08-06T13:00:00Z" }),
        agendaEntry({ id: "nda-u1", owner_user_id: "u1", kind: "nda_poc" }),
        agendaEntry({ id: "nda-u2", owner_user_id: "u2", kind: "nda_poc" }),
      ],
      users: [
        { id: "u1", name: "Letícia", role: "analista", stages: ["prospecting", "meetings"] },
        { id: "u2", name: "Tinoco", role: "gerente", stages: ["nda_poc"] },
      ],
      referenceAt: "2026-08-05T15:00:00Z",
    });

    expect(summary.funnel.map(({ key, count }) => [key, count])).toEqual([
      ["prospecting", 48],
      ["meetings", 1],
      ["nda_poc", 5],
    ]);
    expect(summary.funnel.map((item) => item.conversion)).toEqual([null, 2.1, 500]);
    expect(summary.kpis.map((item) => item.key)).toEqual(["meeting", "nda_poc", "proposal"]);
    expect(summary.agenda.map((item) => item.id)).toEqual(["nda-u2", "meeting-u1"]);
  });

  it("não exibe etapas nem inventa conversões para usuário sem atribuição", () => {
    const summary = buildCommercialDashboard({
      states: [state], agendaEntries: [agendaEntry()], users: [{ id: "u1", name: "Sem escopo", role: "analista", stages: [] }], referenceAt: "2026-08-05T15:00:00Z",
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
        role: "analista",
        stages: ["prospecting"],
        scopeUpdatedAt: "2026-08-05T10:00:00Z",
      }],
      referenceAt: "2026-08-05T15:00:00Z",
    });

    expect(summary.updatedAt).toBeNull();
    expect(summary.updatedBy).toBeNull();
  });
});
