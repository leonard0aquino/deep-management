import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PriorityActionCenter } from "@/components/dashboard/executive/priority-action-center";
import type { DashboardData } from "@/lib/data";
import type { ActionTask, ActionTaskEvent } from "@/lib/types/database";
import type { PriorityAction } from "@/services/priority-actions";

vi.mock("@/components/dashboard/executive/action-task-dialog", () => ({
  ActionTaskDialog: ({ open, intent }: { open: boolean; intent: { assignedTo?: string | null } | null }) =>
    open ? <div data-testid="task-dialog" data-assignee={intent?.assignedTo ?? ""} /> : null,
}));
vi.mock("@/components/dashboard/registros/interaction-form-dialog", () => ({
  InteractionFormDialog: () => null,
}));

const data: DashboardData = {
  interactions: [],
  matrix: [],
  healthScore: { score: 0, critical_count: 0, tracked_combinations: 0 },
  clientHealth: [],
  stakeholders: [],
  clients: [],
  products: [],
  managers: [],
  contacts: [],
  clientProducts: [],
  clientProductOwners: [],
      scoreSettings: {
    id: true,
    target_score: 85,
    weight_recency: 0.35,
    weight_frequency: 0.25,
    weight_relevance: 0.2,
    weight_participation: 0.1,
    weight_diversity: 0.1,
    threshold_recente_dias: 7,
    threshold_ok_dias: 21,
    threshold_atencao_dias: 45,
    threshold_alerta_dias: 90,
    updated_at: "2026-07-27T10:00:00Z",
      },
  commercialPlans: [],
  playbooks: [],
  playbookSteps: [],
  cadences: [],
};
const recommendation: PriorityAction = {
  key: "v1:c1:p1:critical",
  clientId: "c1",
  clientName: "Acme",
  productId: "p1",
  productName: "Suite",
  priority: "alta",
  reason: "Relacionamento crítico.",
  managerName: null,
  dueAt: "2000-01-01T12:00:00.000Z",
  daysSinceContact: 90,
  score: 20,
};

describe("PriorityActionCenter", () => {
  it("exibe atraso e permite assumir uma recomendação", () => {
    render(
      <PriorityActionCenter
        actions={[recommendation]}
        decisions={[]}
        tasks={[]}
        events={[]}
        users={[{ id: "u1", name: "Ana" }]}
        userId="u1"
        data={data}
      />,
    );

    expect(screen.getByText("Atrasada")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Assumir" }));
    expect(screen.getByTestId("task-dialog").getAttribute("data-assignee")).toBe("u1");
  });

  it("mantém tarefas sem recomendação e apresenta o histórico auditável", () => {
    const task: ActionTask = {
      id: "t1", action_key: recommendation.key, client_id: "c1", client_name: "Acme",
      product_id: "p1", product_name: "Suite",
      priority: "alta", reason: "Razão persistida", status: "completed", assigned_to: "u1",
      due_date: "2026-07-26", justification: null, result: "Cliente recuperado",
      created_by: "u1", updated_by: "u1", created_at: "2026-07-26T10:00:00Z",
      updated_at: "2026-07-27T10:00:00Z",
    };
    const event: ActionTaskEvent = {
      id: "e1", task_id: "t1", event_type: "completed", from_status: "in_progress",
      to_status: "completed", actor_id: "u1", assigned_to: "u1", due_date: "2026-07-26",
      justification: null, result: "Cliente recuperado", created_at: "2026-07-27T10:00:00Z",
    };

    render(
      <PriorityActionCenter
        actions={[]}
        decisions={[]}
        tasks={[task]}
        events={[event]}
        users={[{ id: "u1", name: "Ana" }]}
        userId="u1"
        data={{
          ...data,
          clients: [{ id: "c1", name: "Acme" } as DashboardData["clients"][number]],
          products: [{ id: "p1", name: "Suite" } as DashboardData["products"][number]],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Concluídas · 1" }));
    expect(screen.getByText("Razão persistida")).toBeTruthy();
    fireEvent.click(screen.getByText("Histórico · 1"));
    expect(screen.getByText("Tarefa concluída")).toBeTruthy();
    expect(screen.getByText("Resultado: Cliente recuperado")).toBeTruthy();
  });
});
