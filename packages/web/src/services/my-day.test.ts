import { describe, expect, it } from "vitest";
import type { DashboardData } from "@/lib/data";
import type { ActionTask, Client, ClientHealth, DeepManager, InteractionView, Notification } from "@/lib/types/database";
import { addCivilDays, buildMyDaySummary, civilDaysBetween, todayInSaoPaulo } from "@/services/my-day";

const TODAY = "2026-07-27";

function manager(overrides: Partial<DeepManager> = {}): DeepManager {
  return {
    id: "m1", name: "Marina", email: null, avatar_color: null, active: true,
    linked_user_id: "u1", created_at: "2026-01-01", ...overrides,
  };
}

function client(id: string, renewal: string | null): Client {
  return {
    id, name: `Cliente ${id}`, segment: null, logo_url: null, contract_value: null,
    contract_renewal_date: renewal, owner_manager_id: id === "c1" ? "m1" : "m2", active: true, custom_fields: {}, created_at: "2026-01-01",
  };
}

function health(id: string, days: number): ClientHealth {
  return { client_id: id, client_name: `Cliente ${id}`, score: 60, days_since_last_contact: days, tracked_products: 2, critical_products: 1 };
}

function interaction(overrides: Partial<InteractionView> = {}): InteractionView {
  return {
    id: "i1", client_id: "c1", client_name: "Cliente c1", product_id: "p1", product_name: "Suite",
    product_color: null, manager_id: "m1", manager_name: "Marina", contact_id: null, contact_name: null,
    interaction_type: "meeting", topic: "Reunião executiva", notes: null, decisions: null,
    customer_sentiment: null, risks: null, opportunities: null, next_step: null, next_step_owner: null,
    next_step_due_date: null, additional_participants: [], confidential: false, relevance: 4,
    occurred_at: TODAY, links: [], created_by: null, created_at: TODAY, updated_at: TODAY,
    days_since_contact: 0, status: "recente", ...overrides,
  };
}

function task(overrides: Partial<ActionTask> = {}): ActionTask {
  return {
    id: "t1", action_key: "a1", client_id: "c1", client_name: "Cliente c1",
    product_id: "p1", product_name: "Suite", priority: "alta", reason: "Ação necessária",
    status: "pending", assigned_to: "u1", due_date: TODAY, justification: null, result: null,
    created_by: "u1", updated_by: "u1", created_at: TODAY, updated_at: TODAY, ...overrides,
  };
}

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n1", user_id: "u1", title: "Alerta", body: null, href: "/accounts/c1", read: false,
    read_at: null, severity: "warning", category: "risk", dedupe_key: null, created_at: TODAY,
    ...overrides,
  };
}

function dashboardData(): DashboardData {
  return {
    interactions: [
      interaction({ id: "past", occurred_at: "2026-07-26" }),
      interaction({ id: "limit", occurred_at: "2026-08-03" }),
      interaction({ id: "outside-manager", client_id: "c2", client_name: "Cliente c2", manager_id: "m2", manager_name: "Carlos" }),
    ],
    matrix: [],
    healthScore: { score: 60, critical_count: 1, tracked_combinations: 2 },
    clientHealth: [health("c1", 31), health("c2", 90)],
    stakeholders: [],
    clients: [client("c1", "2026-10-25"), client("c2", "2026-08-10")],
    products: [],
    managers: [manager(), manager({ id: "m2", name: "Carlos", linked_user_id: "u2" })],
    contacts: [],
    clientProducts: [
      { id: "cp1", client_id: "c1", product_id: "p1", owner_manager_id: "m1", contract_value: null, renewal_date: null, active: true, created_at: TODAY, updated_at: TODAY },
      { id: "cp2", client_id: "c2", product_id: "p1", owner_manager_id: "m2", contract_value: null, renewal_date: null, active: true, created_at: TODAY, updated_at: TODAY },
    ],
    clientProductOwners: [
      { id: "cpo1", client_product_id: "cp1", manager_id: "m1", active: true, created_at: TODAY, updated_at: TODAY },
      { id: "cpo2", client_product_id: "cp2", manager_id: "m2", active: true, created_at: TODAY, updated_at: TODAY },
    ],
    scoreSettings: {
      id: true, target_score: 85, weight_recency: 0.35, weight_frequency: 0.25,
      weight_relevance: 0.2, weight_participation: 0.1, weight_diversity: 0.1,
      threshold_recente_dias: 7, threshold_ok_dias: 21, threshold_atencao_dias: 45,
      threshold_alerta_dias: 90, updated_at: TODAY,
    },
    commercialPlans: [],
    playbooks: [],
    playbookSteps: [],
    cadences: [],
  };
}

describe("Meu dia", () => {
  it("calcula datas civis sem depender de horário de verão ou UTC", () => {
    expect(addCivilDays("2026-07-27", 7)).toBe("2026-08-03");
    expect(civilDaysBetween("2026-07-27", "2026-10-25")).toBe(90);
    expect(todayInSaoPaulo(new Date("2026-07-28T01:00:00Z"))).toBe("2026-07-27");
  });

  it("separa tarefas de hoje e atrasadas e exclui estados fechados", () => {
    const summary = buildMyDaySummary({
      userId: "u1", today: TODAY, data: dashboardData(), notifications: [],
      tasks: [
        task(),
        task({ id: "late", action_key: "a2", due_date: "2026-07-26" }),
        task({ id: "closed", action_key: "a3", status: "completed" }),
        task({ id: "other", action_key: "a4", assigned_to: "u2" }),
      ],
    });

    expect(summary.tasksToday.map((item) => item.id)).toEqual(["t1"]);
    expect(summary.overdueTasks.map((item) => item.id)).toEqual(["late"]);
  });

  it("aplica o recorte do executivo e inclui os limites de 7, 30 e 90 dias", () => {
    const summary = buildMyDaySummary({
      userId: "u1", today: TODAY, data: dashboardData(), tasks: [], notifications: [notification()],
    });

    expect(summary.scope).toBe("personal");
    expect(summary.manager?.name).toBe("Marina");
    expect(summary.staleClients.map((item) => item.client_id)).toEqual(["c1"]);
    expect(summary.upcomingRenewals.map((item) => [item.id, item.daysRemaining])).toEqual([["c1", 90]]);
    expect(summary.meetingsToPrepare.map((item) => item.id)).toEqual(["limit"]);
    expect(summary.recentInteractions.map((item) => item.id)).toEqual(["past"]);
    expect(summary.unreadNotifications).toHaveLength(1);
  });

  it("usa a visão geral e comunica o fallback quando o usuário não possui executivo vinculado", () => {
    const summary = buildMyDaySummary({
      userId: "sem-vinculo", today: TODAY, data: dashboardData(), tasks: [], notifications: [],
    });

    expect(summary.scope).toBe("operation");
    expect(summary.manager).toBeNull();
    expect(summary.staleClients.map((item) => item.client_id)).toEqual(["c2", "c1"]);
    expect(summary.upcomingRenewals.map((item) => item.id)).toEqual(["c2", "c1"]);
  });

  it("usa a responsabilidade por produto como fonte de escopo", () => {
    const data = dashboardData();
    data.clients = [
      client("c1", null),
      { ...client("c2", null), owner_manager_id: null },
    ];
    data.interactions = [
      interaction({ id: "owned", client_id: "c1", manager_id: "m2" }),
      interaction({ id: "legacy", client_id: "c2", manager_id: "m1" }),
    ];
    data.clientHealth = [health("c1", 40), health("c2", 50)];

    const summary = buildMyDaySummary({ userId: "u1", today: TODAY, data, tasks: [], notifications: [] });

    expect(summary.staleClients.map((item) => item.client_id)).toEqual(["c1"]);
    expect(summary.recentInteractions.map((item) => item.id)).toEqual(["owned"]);
  });
});
