import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MyDayDashboard } from "@/components/dashboard/my-day/my-day-dashboard";
import type { MyDaySummary } from "@/services/my-day";

function summary(overrides: Partial<MyDaySummary> = {}): MyDaySummary {
  return {
    scope: "personal",
    manager: {
      id: "m1", name: "Marina", email: null, avatar_color: null, active: true,
      linked_user_id: "u1", created_at: "2026-01-01",
    },
    tasksToday: [{
      id: "t1", action_key: "a1", client_id: "c1", client_name: "Acme", product_id: "p1",
      product_name: "Suite", priority: "alta", reason: "Ação", status: "pending", assigned_to: "u1",
      due_date: "2026-07-27", justification: null, result: null, created_by: "u1", updated_by: "u1",
      created_at: "2026-07-27", updated_at: "2026-07-27",
    }],
    overdueTasks: [],
    staleClients: [{
      client_id: "c1", client_name: "Acme", score: 60, days_since_last_contact: 42,
      tracked_products: 2, critical_products: 1,
    }],
    upcomingRenewals: [{
      id: "c1", name: "Acme", segment: null, logo_url: null, contract_value: null,
      contract_renewal_date: "2026-08-26", owner_manager_id: "m1", client_kind: "customer", active: true, custom_fields: {}, created_at: "2026-01-01",
      daysRemaining: 30,
    }],
    meetingsToPrepare: [{
      id: "i1", client_id: "c1", client_name: "Acme", product_id: "p1", product_name: "Suite",
      product_color: null, manager_id: "m1", manager_name: "Marina", contact_id: null, contact_name: null,
      interaction_type: "meeting", topic: "Reunião executiva", notes: null, decisions: null,
      customer_sentiment: null, risks: null, opportunities: null, next_step: null, next_step_owner: null,
      next_step_due_date: null, additional_participants: [], confidential: false, business_area: "customer_success", counts_for_health: true, relevance: 4,
      occurred_at: "2026-07-28", links: [], created_by: null, created_at: "2026-07-27",
      updated_at: "2026-07-27", days_since_contact: -1, status: "recente",
    }],
    unreadNotifications: [{
      id: "n1", user_id: "u1", title: "Cliente em risco", body: null, href: "/accounts/c1",
      read: false, read_at: null, severity: "critical", category: "risk", dedupe_key: null,
      created_at: "2026-07-27",
    }],
    recentInteractions: [],
    ...overrides,
  };
}

afterEach(cleanup);

describe("MyDayDashboard", () => {
  it("prioriza tarefas e apresenta o contexto pessoal com links operacionais", () => {
    render(<MyDayDashboard summary={summary()} />);

    expect(screen.getByRole("status").textContent).toContain("Marina");
    expect(screen.getByRole("heading", { name: "Minhas ações para hoje" })).toBeTruthy();
    expect(screen.getAllByText("Acme · Suite").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Central de Ações" }).getAttribute("href")).toBe("/#priority-actions");
    expect(screen.getByText(/Reunião executiva/)).toBeTruthy();
    expect(screen.getByText("30 dias")).toBeTruthy();
    expect(screen.getByText("42 dias")).toBeTruthy();
    expect(screen.getByText("Cliente em risco")).toBeTruthy();
    expect(screen.getByText("Crítica")).toBeTruthy();
  });

  it("comunica a visão geral e orienta cada seção vazia", () => {
    render(<MyDayDashboard summary={summary({
      scope: "operation", manager: null, tasksToday: [], overdueTasks: [], staleClients: [],
      upcomingRenewals: [], meetingsToPrepare: [], unreadNotifications: [], recentInteractions: [],
    })} />);

    expect(screen.getByRole("status").textContent).toContain("visão geral da operação");
    const priorities = screen.getByRole("region", { name: "Prioridades imediatas" });
    expect(within(priorities).getByText("Nenhuma tarefa para hoje")).toBeTruthy();
    expect(within(priorities).getByText("Nenhuma tarefa atrasada")).toBeTruthy();
    expect(screen.getByText("Nenhuma reunião próxima")).toBeTruthy();
    expect(screen.getByText("Nenhuma renovação próxima")).toBeTruthy();
    expect(screen.getByText("Carteira em dia")).toBeTruthy();
    expect(screen.getByText("Tudo lido")).toBeTruthy();
    expect(screen.getByText("Nenhuma interação recente")).toBeTruthy();
  });
});
