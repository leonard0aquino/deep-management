import { describe, expect, it } from "vitest";
import type { ActionDecision, ActionTask, Client, Product } from "@/lib/types/database";
import {
  allowedActionTaskTransitions,
  isActionTaskOverdue,
  reconcileActionTasks,
  validateActionTaskChange,
} from "@/services/action-tasks";
import type { PriorityAction } from "@/services/priority-actions";

function action(overrides: Partial<PriorityAction> = {}): PriorityAction {
  return {
    key: "v1:c1:p1:critical",
    clientId: "c1",
    clientName: "Acme",
    productId: "p1",
    productName: "Suite",
    priority: "alta",
    reason: "Relacionamento crítico.",
    managerName: null,
    dueAt: "2026-07-28T12:00:00.000Z",
    daysSinceContact: 45,
    score: 32,
    ...overrides,
  };
}

function task(overrides: Partial<ActionTask> = {}): ActionTask {
  return {
    id: "t1",
    action_key: "v1:c1:p1:critical",
    client_id: "c1",
    client_name: "Acme",
    product_id: "p1",
    product_name: "Suite",
    priority: "alta",
    reason: "Razão persistida",
    status: "in_progress",
    assigned_to: "u1",
    due_date: "2026-07-30",
    justification: null,
    result: null,
    created_by: "u1",
    updated_by: "u1",
    created_at: "2026-07-27T10:00:00Z",
    updated_at: "2026-07-27T11:00:00Z",
    ...overrides,
  };
}

const clients = [{ id: "c1", name: "Acme" } as Client];
const products = [{ id: "p1", name: "Suite" } as Product];

describe("action tasks", () => {
  it("faz a tarefa persistida prevalecer sobre a dispensa legada", () => {
    const decisions: ActionDecision[] = [{
      id: "d1", user_id: "u1", action_key: "v1:c1:p1:critical", status: "dismissed",
      created_at: "2026-07-20T10:00:00Z", updated_at: "2026-07-20T10:00:00Z",
    }];
    const [item] = reconcileActionTasks({ actions: [action()], tasks: [task()], decisions, clients, products });

    expect(item.status).toBe("in_progress");
    expect(item.legacyDismissed).toBe(false);
    expect(item.dueDate).toBe("2026-07-30");
  });

  it("mantém uma tarefa consultável quando a recomendação deixa de existir", () => {
    const [item] = reconcileActionTasks({ actions: [], tasks: [task()], decisions: [], clients, products });

    expect(item.clientName).toBe("Acme");
    expect(item.productName).toBe("Suite");
    expect(item.reason).toBe("Razão persistida");
  });

  it("preserva dispensas anteriores quando ainda não há tarefa", () => {
    const decisions: ActionDecision[] = [{
      id: "d1", user_id: "u1", action_key: "v1:c1:p1:critical", status: "dismissed",
      created_at: "2026-07-20T10:00:00Z", updated_at: "2026-07-20T10:00:00Z",
    }];
    const [item] = reconcileActionTasks({ actions: [action()], tasks: [], decisions, clients, products });

    expect(item.status).toBe("dismissed");
    expect(item.legacyDismissed).toBe(true);
  });

  it("identifica atraso somente em estados que exigem execução", () => {
    expect(isActionTaskOverdue("pending", "2026-07-26", "2026-07-27")).toBe(true);
    expect(isActionTaskOverdue("postponed", "2026-07-26", "2026-07-27")).toBe(true);
    expect(isActionTaskOverdue("completed", "2026-07-26", "2026-07-27")).toBe(false);
    expect(isActionTaskOverdue("dismissed", "2026-07-26", "2026-07-27")).toBe(false);
  });

  it("valida dados obrigatórios de adiamento, dispensa e conclusão", () => {
    expect(validateActionTaskChange({ status: "postponed", assignedTo: "u1", dueDate: "2026-07-27", justification: "", result: "", today: "2026-07-27" })).toContain("data futura");
    expect(validateActionTaskChange({ status: "dismissed", assignedTo: null, dueDate: "2026-07-28", justification: "", result: "", today: "2026-07-27" })).toContain("justificativa");
    expect(validateActionTaskChange({ status: "completed", assignedTo: "u1", dueDate: "2026-07-28", justification: "", result: "", today: "2026-07-27" })).toContain("resultado");
    expect(validateActionTaskChange({ status: "completed", assignedTo: "u1", dueDate: "2026-07-28", justification: "", result: "Resolvido", today: "2026-07-27" })).toBeNull();
  });

  it("exige responsável para qualquer tarefa que não seja dispensada", () => {
    expect(validateActionTaskChange({ status: "pending", assignedTo: null, dueDate: "2026-07-28", justification: "", result: "" })).toContain("responsável");
    expect(validateActionTaskChange({ status: "dismissed", assignedTo: null, dueDate: "2026-07-28", justification: "Duplicidade", result: "" })).toBeNull();
  });

  it("permite reabrir estados finais sem oferecer transições indevidas", () => {
    expect(allowedActionTaskTransitions("completed")).toEqual(["completed", "pending"]);
    expect(allowedActionTaskTransitions("dismissed")).toEqual(["dismissed", "pending"]);
  });
});
