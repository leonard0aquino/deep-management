import { describe, expect, it } from "vitest";
import type { ActionTask, ActionTaskEvent, Client, ClientRiskOpportunity, DeepManager, InteractionView } from "@/lib/types/database";
import type { DataQualityPortfolio } from "@/services/data-quality";
import { buildExecutiveReport, normalizeExecutiveReportPeriod } from "@/services/executive-report";

const client: Client = { id: "c1", name: "Acme", segment: null, logo_url: null, contract_value: 1000, contract_renewal_date: "2026-08-20", owner_manager_id: null, active: true, custom_fields: {}, created_at: "2026-01-01" };
const manager: DeepManager = { id: "m1", name: "Ana", email: null, avatar_color: null, active: true, linked_user_id: "u1", created_at: "2026-01-01" };
const interaction: InteractionView = { id: "i1", client_id: "c1", client_name: "Acme", product_id: "p1", product_name: "Produto", product_color: null, manager_id: "m1", manager_name: "Ana", contact_id: null, contact_name: null, interaction_type: "meeting", topic: "Revisão", notes: "Notas", decisions: "Aprovado", customer_sentiment: null, risks: null, opportunities: null, next_step: null, next_step_owner: null, next_step_due_date: null, additional_participants: [], confidential: false, relevance: 4, occurred_at: "2026-07-22", links: [], created_by: "u1", created_at: "2026-07-22", updated_at: "2026-07-22", days_since_contact: 6, status: "recente" };
const task: ActionTask = { id: "t1", action_key: "t1", client_id: "c1", client_name: "Acme", product_id: "p1", product_name: "Produto", priority: "alta", reason: "Plano de recuperação", status: "in_progress", assigned_to: "u1", due_date: "2026-07-20", justification: null, result: null, created_by: "u1", updated_by: "u1", created_at: "2026-07-01", updated_at: "2026-07-20" };
const event: ActionTaskEvent = { id: "e1", task_id: "t1", event_type: "postponed", from_status: "pending", to_status: "postponed", actor_id: "u1", assigned_to: "u1", due_date: "2026-07-20", justification: "Dependência", result: null, created_at: "2026-07-28T10:00:00Z" };
const risk: ClientRiskOpportunity = { id: "r1", client_id: "c1", kind: "risco", title: "Adoção crítica", description: null, impact: "alto", probability: "alta", owner_manager_id: "m1", target_date: "2026-07-25", status: "aberto", created_by: "u1", updated_by: "u1", created_at: "2026-07-20", updated_at: "2026-07-27" };
const quality: DataQualityPortfolio = { averageScore: 63, activeClients: 1, completeClients: 0, reports: [], issueCounts: [] };
const base = { clients: [client], interactions: [interaction], portfolioItems: [risk], commercialPlans: [], tasks: [task], events: [event], managers: [manager], healthScore: 72, dataQuality: quality, referenceDate: "2026-07-28", generatedAt: "2026-07-28T12:00:00Z", periodDays: 7 as const };

describe("relatório executivo", () => {
  it("normaliza períodos desconhecidos para sete dias", () => {
    expect(normalizeExecutiveReportPeriod("30")).toBe(30);
    expect(normalizeExecutiveReportPeriod("12")).toBe(7);
  });

  it("consolida resumo, mudanças e ordena itens prioritários", () => {
    const report = buildExecutiveReport(base);
    expect(report.period).toEqual({ days: 7, start: "2026-07-22", end: "2026-07-28" });
    expect(report.summary).toMatchObject({ activeClients: 1, healthScore: 72, dataQualityScore: 63, activeContractValue: 1000, clientsWithoutNextAction: 0 });
    expect(report.changes).toMatchObject({ interactions: 1, actionUpdates: 1, portfolioUpdates: 1, commercialUpdates: 0 });
    expect(report.risks[0]).toMatchObject({ title: "Adoção crítica", priority: "Alta", overdue: true });
    expect(report.overdueActions[0]).toMatchObject({ ownerName: "Ana", daysOverdue: 8 });
  });

  it("limita a linha do tempo às vinte mudanças mais recentes sem perder o total", () => {
    const interactions = Array.from({ length: 25 }, (_, index) => ({ ...interaction, id: `i${index}`, occurred_at: `2026-07-${String(22 + (index % 7)).padStart(2, "0")}` }));
    const report = buildExecutiveReport({ ...base, interactions });
    expect(report.changes.total).toBe(27);
    expect(report.changes.timeline).toHaveLength(20);
    expect(report.changes.timeline[0].occurredAt.startsWith("2026-07-28")).toBe(true);
  });

  it("deriva as quatro classes de decisão da liderança", () => {
    const report = buildExecutiveReport(base);
    expect(report.decisions.map((item) => item.kind)).toEqual(["owner", "risk", "renewal", "overdue_action"]);
  });

  it("ignora eventos fora do período, itens fechados, tarefas terminais e clientes inativos", () => {
    const report = buildExecutiveReport({ ...base, clients: [{ ...client, active: false }], events: [{ ...event, created_at: "2026-07-21" }], portfolioItems: [{ ...risk, status: "concluido" }], tasks: [{ ...task, status: "completed" }] });
    expect(report.summary.activeClients).toBe(0);
    expect(report.changes.timeline).toEqual([]);
    expect(report.risks).toEqual([]);
    expect(report.overdueActions).toEqual([]);
    expect(report.decisions).toEqual([]);
  });

  it("retorna métricas neutras para carteira vazia", () => {
    const report = buildExecutiveReport({ ...base, clients: [], interactions: [], portfolioItems: [], tasks: [], events: [], healthScore: Number.NaN, dataQuality: { ...quality, averageScore: 100 } });
    expect(report.summary).toEqual({ activeClients: 0, healthScore: 0, dataQualityScore: 100, activeContractValue: 0, clientsWithoutNextAction: 0 });
  });
});
