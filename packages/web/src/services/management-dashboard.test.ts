import { describe, expect, it } from "vitest";
import type {
  ActionTask,
  ActionTaskEvent,
  Client,
  ClientCommercialPlan,
  ClientProduct,
  DeepManager,
  InteractionView,
  StakeholderHealth,
} from "@/lib/types/database";
import { buildManagementDashboard } from "@/services/management-dashboard";

const managers: DeepManager[] = [
  { id: "m1", name: "Ana", email: null, avatar_color: null, active: true, linked_user_id: "u1", created_at: "2026-01-01" },
];

function client(id: string, owner: string | null = "m1", value = 1_000, active = true): Client {
  return { id, name: `Cliente ${id}`, segment: null, logo_url: null, contract_value: value, contract_renewal_date: "2026-10-01", owner_manager_id: owner, active, custom_fields: {}, created_at: "2026-01-01" };
}

function task(id: string, clientId: string, status: ActionTask["status"], overrides: Partial<ActionTask> = {}): ActionTask {
  return { id, action_key: id, client_id: clientId, client_name: `Cliente ${clientId}`, product_id: "p1", product_name: "Produto", priority: "media", reason: "Acompanhar", status, assigned_to: "u1", due_date: "2026-07-27", justification: null, result: status === "completed" ? "Resolvido" : null, created_by: "u1", updated_by: "u1", created_at: "2026-07-20T12:00:00Z", updated_at: "2026-07-20T12:00:00Z", ...overrides };
}

function event(id: string, taskId: string, date: string): ActionTaskEvent {
  return { id, task_id: taskId, event_type: "completed", from_status: "in_progress", to_status: "completed", actor_id: "u1", assigned_to: "u1", due_date: "2026-07-27", justification: null, result: "Resolvido", created_at: date };
}

function interaction(id: string, managerName: string | null, date: string): InteractionView {
  return { id, client_id: "c1", client_name: "Cliente c1", product_id: "p1", product_name: "Produto", product_color: null, manager_id: managerName ? "m1" : null, manager_name: managerName, contact_id: null, contact_name: null, interaction_type: "meeting", topic: "Revisão", notes: "Notas", decisions: null, customer_sentiment: null, risks: null, opportunities: null, next_step: null, next_step_owner: null, next_step_due_date: null, additional_participants: [], confidential: false, relevance: 4, occurred_at: date, links: [], created_by: "u1", created_at: `${date}T12:00:00Z`, updated_at: `${date}T12:00:00Z`, days_since_contact: 1, status: "recente" };
}

function stakeholder(id: string, clientId: string, role: StakeholderHealth["relationship_role"]): StakeholderHealth {
  return { contact_id: id, client_id: clientId, client_name: `Cliente ${clientId}`, name: id, role: null, email: null, phone: null, influence: "alta", relationship_role: role, owner_manager_id: "m1", owner_manager_name: "Ana", photo_url: null, reports_to_contact_id: null, last_contact: "2026-07-20", interaction_count: 1, last_customer_sentiment: "positive", sentiment_recorded_at: "2026-07-20", days_since_contact: 8, status: "recente", score: 90, risk: "baixo" };
}

function plan(clientId: string, probability: number, status: ClientCommercialPlan["status"] = "em_negociacao"): ClientCommercialPlan {
  return { id: `plan-${clientId}`, client_id: clientId, owner_manager_id: "m1", status, probability, expected_renewal_value: 1_000, expansion_value: 0, next_step: "Negociar", next_step_due_date: "2026-08-01", notes: null, created_by: "u1", updated_by: "u1", created_at: "2026-07-01", updated_at: "2026-07-01" };
}

const base = {
  clients: [client("c1"), client("c2", null)],
  managers,
  interactions: [] as InteractionView[],
  tasks: [] as ActionTask[],
  events: [] as ActionTaskEvent[],
  stakeholders: [] as StakeholderHealth[],
  commercialPlans: [] as ClientCommercialPlan[],
  clientProducts: [
    { id: "cp1", client_id: "c1", product_id: "p1", owner_manager_id: "m1", contract_value: null, renewal_date: null, active: true, created_at: "2026-01-01", updated_at: "2026-01-01" },
    { id: "cp2", client_id: "c2", product_id: "p1", owner_manager_id: null, contract_value: null, renewal_date: null, active: true, created_at: "2026-01-01", updated_at: "2026-01-01" },
  ] as ClientProduct[],
  referenceDate: "2026-07-28",
};

describe("management-dashboard", () => {
  it("agrupa clientes e interações e mantém itens sem responsável", () => {
    const result = buildManagementDashboard({ ...base, interactions: [interaction("i1", "Ana", "2026-07-28"), interaction("i2", null, "2026-07-28")] });
    expect(result.clientsByOwner).toEqual(expect.arrayContaining([{ name: "Ana", count: 1 }, { name: "Sem responsável", count: 1 }]));
    expect(result.interactionsByOwner).toEqual(expect.arrayContaining([{ name: "Ana", count: 1 }, { name: "Sem responsável", count: 1 }]));
  });

  it("consolida ações, atrasos, alertas e clientes sem próxima ação", () => {
    const result = buildManagementDashboard({ ...base, tasks: [task("t1", "c1", "in_progress", { priority: "alta" }), task("t2", "c2", "completed")] });
    expect(result.actions).toMatchObject({ open: 1, completed: 1, overdue: 1 });
    expect(result.alerts).toEqual({ untreated: 1, overdue: 1 });
    expect(result.clientsWithoutNextAction.map((item) => item.id)).toEqual(["c2"]);
  });

  it("usa a conclusão mais recente para o tempo de resolução de tarefa reaberta", () => {
    const result = buildManagementDashboard({ ...base, tasks: [task("t1", "c1", "completed")], events: [event("e1", "t1", "2026-07-22T12:00:00Z"), event("e2", "t1", "2026-07-25T12:00:00Z")] });
    expect(result.actions.averageResolutionDays).toBe(5);
  });

  it("calcula cobertura dos quatro papéis e concentração por cliente", () => {
    const result = buildManagementDashboard({ ...base, stakeholders: [stakeholder("s1", "c1", "patrocinador"), stakeholder("s2", "c1", "decisor")] });
    expect(result.stakeholderCoverage.percent).toBe(25);
    expect(result.stakeholderCoverage.concentratedClients).toBe(1);
    expect(result.stakeholderCoverage.byRole.find((item) => item.role === "patrocinador")?.percent).toBe(50);
  });

  it("calcula receita em risco para probabilidades 0 e 100 e ignora plano encerrado", () => {
    const result = buildManagementDashboard({ ...base, commercialPlans: [plan("c1", 0), plan("c2", 100), plan("c1", 0, "renovado")] });
    expect(result.revenueAtRisk).toBe(1_000);
  });

  it("preenche seis meses de evolução, inclusive meses sem movimento", () => {
    const result = buildManagementDashboard({ ...base, interactions: [interaction("i1", "Ana", "2026-03-10")], tasks: [task("t1", "c1", "completed")], events: [event("e1", "t1", "2026-07-25T12:00:00Z"), event("e2", "inactive-task", "2026-07-26T12:00:00Z")] });
    expect(result.monthlyEvolution.map((item) => item.key)).toEqual(["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"]);
    expect(result.monthlyEvolution.find((item) => item.key === "2026-03")?.interactions).toBe(1);
    expect(result.monthlyEvolution.find((item) => item.key === "2026-04")?.completedActions).toBe(0);
    expect(result.monthlyEvolution.find((item) => item.key === "2026-07")?.completedActions).toBe(1);
  });

  it("retorna zeros e listas vazias quando não há carteira", () => {
    const result = buildManagementDashboard({ ...base, clients: [] });
    expect(result.actions).toEqual({ open: 0, completed: 0, overdue: 0, averageResolutionDays: 0 });
    expect(result.stakeholderCoverage).toMatchObject({ percent: 0, concentratedClients: 0 });
    expect(result.revenueAtRisk).toBe(0);
  });
});
