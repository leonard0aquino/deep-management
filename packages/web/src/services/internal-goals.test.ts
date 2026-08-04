import { describe, expect, it } from "vitest";
import type { ActionTask, ActionTaskEvent, Client, ClientRiskOpportunity, ClientSuccessPlan, InteractionView, InternalGoal, Notification, StakeholderHealth } from "@/lib/types/database";
import { buildInternalGoals, DEFAULT_INTERNAL_GOALS, validateInternalGoalTarget } from "@/services/internal-goals";

const referenceAt = "2026-07-28T18:00:00.000Z";
const client = (id: string, active = true): Client => ({ id, name: id, segment: null, logo_url: null, contract_value: null, contract_renewal_date: null, owner_manager_id: "m1", client_kind: "customer", active, custom_fields: {}, created_at: "2026-01-01" });
const interaction = (clientId: string, occurredAt: string): InteractionView => ({ id: `i-${clientId}`, client_id: clientId, client_name: clientId, product_id: "p1", product_name: "P", product_color: null, manager_id: "m1", manager_name: "Ana", contact_id: null, contact_name: null, interaction_type: "meeting", topic: "Revisão", notes: "Notas", decisions: null, customer_sentiment: null, risks: null, opportunities: null, next_step: null, next_step_owner: null, next_step_due_date: null, additional_participants: [], confidential: false, business_area: "customer_success", counts_for_health: true, relevance: 4, occurred_at: occurredAt, links: [], created_by: "u1", created_at: occurredAt, updated_at: occurredAt, days_since_contact: 0, status: "recente" });
const task = (id: string, clientId: string, dueDate: string, status: ActionTask["status"] = "completed"): ActionTask => ({ id, action_key: id, client_id: clientId, client_name: clientId, product_id: "p1", product_name: "P", priority: "alta", reason: "Agir", status, assigned_to: "u1", due_date: dueDate, justification: null, result: status === "completed" ? "Feito" : null, created_by: "u1", updated_by: "u1", created_at: "2026-07-01T12:00:00Z", updated_at: "2026-07-20T12:00:00Z" });
const completion = (id: string, taskId: string, completedAt: string, dueDate: string): ActionTaskEvent => ({ id, task_id: taskId, event_type: "completed", from_status: "in_progress", to_status: "completed", actor_id: "u1", assigned_to: "u1", due_date: dueDate, justification: null, result: "Feito", created_at: completedAt });
const stakeholder = (id: string, clientId: string, role: StakeholderHealth["relationship_role"]): StakeholderHealth => ({ contact_id: id, client_id: clientId, client_name: clientId, name: id, role: null, email: null, phone: null, influence: "alta", relationship_role: role, owner_manager_id: "m1", owner_manager_name: "Ana", photo_url: null, reports_to_contact_id: null, last_contact: "2026-07-20", interaction_count: 1, last_customer_sentiment: "positive", sentiment_recorded_at: "2026-07-20", days_since_contact: 8, status: "recente", score: 90, risk: "baixo" });
const risk = (clientId: string, status: ClientRiskOpportunity["status"] = "aberto"): ClientRiskOpportunity => ({ id: `r-${clientId}`, client_id: clientId, kind: "risco", title: "Risco", description: null, impact: "alto", probability: "media", owner_manager_id: "m1", target_date: "2026-08-10", status, created_by: "u1", updated_by: "u1", created_at: "2026-07-01", updated_at: "2026-07-20" });
const notification = (id: string, createdAt: string, readAt: string | null): Notification => ({ id, user_id: "u1", title: "Alerta", body: null, href: null, read: Boolean(readAt), read_at: readAt, severity: "warning", category: "risk", dedupe_key: null, created_at: createdAt });
const plan = (clientId: string, updatedAt: string, status: ClientSuccessPlan["status"] = "ativo"): ClientSuccessPlan => ({ id: `p-${clientId}`, client_id: clientId, objective: "Adoção", expected_outcome: "80%", owner_manager_id: "m1", target_date: "2026-12-01", status, created_by: "u1", updated_by: "u1", created_at: "2026-01-01", updated_at: updatedAt });

const riskGoal: InternalGoal = { ...DEFAULT_INTERNAL_GOALS.find((goal) => goal.key === "risk_client_reduction")!, baseline_value: 2 };
const base = {
  clients: [client("c1"), client("c2")],
  interactions: [interaction("c1", "2026-07-28T12:00:00Z"), interaction("c2", "2026-04-29T12:00:00Z")],
  tasks: [task("t1", "c1", "2026-07-27"), task("t2", "c2", "2026-07-28")],
  events: [completion("e1", "t1", "2026-07-27T12:00:00Z", "2026-07-27"), completion("e2", "t2", "2026-07-28T12:00:00Z", "2026-07-27")],
  stakeholders: ["patrocinador", "decisor", "influenciador", "usuario_chave"].map((role, index) => stakeholder(`s${index}`, "c1", role as StakeholderHealth["relationship_role"])),
  risks: [risk("c1")],
  notifications: [notification("n1", "2026-07-28T12:00:00Z", "2026-07-28T14:00:00Z"), notification("n2", "2026-07-28T12:00:00Z", null)],
  successPlans: [plan("c1", "2026-07-28T12:00:00Z"), plan("c2", "2026-04-29T18:00:00Z")],
  goals: [...DEFAULT_INTERNAL_GOALS.filter((goal) => goal.key !== "risk_client_reduction"), riskGoal],
  referenceAt,
  staleAfterDays: 90,
};

describe("metas internas", () => {
  it("calcula as seis métricas, direções e situações", () => {
    const { results, currentRiskClients } = buildInternalGoals(base);
    expect(results).toHaveLength(6);
    expect(results.find((item) => item.key === "portfolio_on_track")).toMatchObject({ actual: 100, direction: "at_least", status: "achieved" });
    expect(results.find((item) => item.key === "actions_on_time")).toMatchObject({ actual: 50, status: "attention" });
    expect(results.find((item) => item.key === "strategic_stakeholder_coverage")?.actual).toBe(50);
    expect(results.find((item) => item.key === "risk_client_reduction")?.actual).toBe(50);
    expect(results.find((item) => item.key === "alert_response_time")).toMatchObject({ actual: 4, direction: "at_most", status: "achieved" });
    expect(results.find((item) => item.key === "updated_success_plans")?.actual).toBe(100);
    expect(currentRiskClients).toBe(1);
  });

  it("inclui exatamente os limites de 30 e 90 dias", () => {
    const result = buildInternalGoals({ ...base, events: [completion("e", "t1", "2026-06-28T18:00:00Z", "2026-06-28")], notifications: [notification("n", "2026-06-28T18:00:00Z", "2026-06-28T19:00:00Z")], successPlans: [plan("c1", "2026-04-29T18:00:00Z")] });
    expect(result.results.find((item) => item.key === "actions_on_time")?.actual).toBe(100);
    expect(result.results.find((item) => item.key === "alert_response_time")?.actual).toBe(1);
    expect(result.results.find((item) => item.key === "updated_success_plans")?.actual).toBe(50);
  });

  it("retorna sem dados para denominadores vazios e linha de base inválida", () => {
    const { results } = buildInternalGoals({ ...base, clients: [], interactions: [], tasks: [], events: [], stakeholders: [], risks: [], notifications: [], successPlans: [], goals: DEFAULT_INTERNAL_GOALS });
    expect(results.every((item) => item.actual === null && item.status === "no_data")).toBe(true);
  });

  it("ignora cliente inativo, risco encerrado e plano cancelado", () => {
    const { results, currentRiskClients } = buildInternalGoals({ ...base, clients: [client("c1"), client("c2", false)], risks: [risk("c1", "concluido"), risk("c2")], successPlans: [plan("c1", "2026-07-28", "cancelado"), plan("c2", "2026-07-28")] });
    expect(currentRiskClients).toBe(0);
    expect(results.find((item) => item.key === "updated_success_plans")?.actual).toBe(0);
  });

  it("valida percentuais e horas nos limites permitidos", () => {
    expect(validateInternalGoalTarget("portfolio_on_track", 0)).toBe(true);
    expect(validateInternalGoalTarget("portfolio_on_track", 101)).toBe(false);
    expect(validateInternalGoalTarget("alert_response_time", 1)).toBe(true);
    expect(validateInternalGoalTarget("alert_response_time", 720)).toBe(true);
    expect(validateInternalGoalTarget("alert_response_time", 0)).toBe(false);
  });
});
