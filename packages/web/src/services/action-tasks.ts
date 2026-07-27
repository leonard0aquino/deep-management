import type {
  ActionDecision,
  ActionTask,
  ActionTaskStatus,
  Client,
  Product,
} from "@/lib/types/database";
import type { PriorityAction } from "@/services/priority-actions";

export type ActionTaskItem = {
  key: string;
  clientId: string;
  clientName: string;
  productId: string;
  productName: string;
  priority: "alta" | "media";
  reason: string;
  recommendedDueDate: string;
  task: ActionTask | null;
  status: ActionTaskStatus;
  assignedTo: string | null;
  dueDate: string;
  updatedAt: string | null;
  legacyDismissed: boolean;
};

const ACTIVE_STATUSES: ActionTaskStatus[] = ["pending", "in_progress", "postponed"];

const TRANSITIONS: Record<ActionTaskStatus, ActionTaskStatus[]> = {
  pending: ["pending", "in_progress", "completed", "postponed", "dismissed"],
  in_progress: ["in_progress", "pending", "completed", "postponed", "dismissed"],
  postponed: ["postponed", "pending", "in_progress", "completed", "dismissed"],
  completed: ["completed", "pending"],
  dismissed: ["dismissed", "pending"],
};

export function dateOnly(value: string): string {
  return value.slice(0, 10);
}

export function isActionTaskOverdue(
  status: ActionTaskStatus,
  dueDate: string,
  today = dateOnly(new Date().toISOString()),
): boolean {
  return ACTIVE_STATUSES.includes(status) && dueDate < today;
}

export function allowedActionTaskTransitions(status: ActionTaskStatus): ActionTaskStatus[] {
  return TRANSITIONS[status];
}

export function validateActionTaskChange({
  status,
  assignedTo,
  dueDate,
  justification,
  result,
  today = dateOnly(new Date().toISOString()),
}: {
  status: ActionTaskStatus;
  assignedTo: string | null;
  dueDate: string;
  justification: string;
  result: string;
  today?: string;
}): string | null {
  if (status !== "dismissed" && !assignedTo) {
    return "Defina o responsável pela tarefa ou registre uma dispensa justificada.";
  }
  if (!dueDate) return "Defina o prazo da tarefa.";
  if (status === "postponed" && dueDate <= today) {
    return "Para adiar, escolha uma nova data futura.";
  }
  if ((status === "postponed" || status === "dismissed") && !justification.trim()) {
    return status === "postponed"
      ? "Informe a justificativa do adiamento."
      : "Informe a justificativa da dispensa.";
  }
  if (status === "completed" && !result.trim()) {
    return "Registre o resultado alcançado para concluir.";
  }
  return null;
}

export function reconcileActionTasks({
  actions,
  tasks,
  decisions,
  clients,
  products,
}: {
  actions: PriorityAction[];
  tasks: ActionTask[];
  decisions: ActionDecision[];
  clients: Client[];
  products: Product[];
}): ActionTaskItem[] {
  const actionsByKey = new Map(actions.map((action) => [action.key, action]));
  const tasksByKey = new Map(tasks.map((task) => [task.action_key, task]));
  const dismissedKeys = new Set(decisions.map((decision) => decision.action_key));
  const clientsById = new Map(clients.map((client) => [client.id, client.name]));
  const productsById = new Map(products.map((product) => [product.id, product.name]));
  const keys = new Set([...actionsByKey.keys(), ...tasksByKey.keys()]);

  return [...keys].map((key): ActionTaskItem => {
    const action = actionsByKey.get(key);
    const task = tasksByKey.get(key) ?? null;
    const legacyDismissed = !task && dismissedKeys.has(key);
    const status = task?.status ?? (legacyDismissed ? "dismissed" : "pending");
    const recommendedDueDate = action ? dateOnly(action.dueAt) : (task?.due_date ?? "");

    return {
      key,
      clientId: action?.clientId ?? task!.client_id,
      clientName: action?.clientName ?? task!.client_name ?? clientsById.get(task!.client_id) ?? "Cliente removido",
      productId: action?.productId ?? task!.product_id,
      productName: action?.productName ?? task!.product_name ?? productsById.get(task!.product_id) ?? "Produto removido",
      priority: action?.priority ?? task!.priority,
      reason: action?.reason ?? task!.reason,
      recommendedDueDate,
      task,
      status,
      assignedTo: task?.assigned_to ?? null,
      dueDate: task?.due_date ?? recommendedDueDate,
      updatedAt: task?.updated_at ?? null,
      legacyDismissed,
    };
  }).sort((left, right) => {
    const leftClosed = left.status === "completed" || left.status === "dismissed";
    const rightClosed = right.status === "completed" || right.status === "dismissed";
    if (leftClosed !== rightClosed) return leftClosed ? 1 : -1;
    if (!leftClosed && left.dueDate !== right.dueDate) return left.dueDate.localeCompare(right.dueDate);
    if (left.priority !== right.priority) return left.priority === "alta" ? -1 : 1;
    return (right.updatedAt ?? "").localeCompare(left.updatedAt ?? "");
  });
}
