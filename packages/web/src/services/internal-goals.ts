import type {
  ActionTask,
  ActionTaskEvent,
  Client,
  ClientRiskOpportunity,
  ClientSuccessPlan,
  InteractionView,
  InternalGoal,
  InternalGoalKey,
  Notification,
  StakeholderHealth,
} from "@/lib/types/database";
import { isActionTaskOverdue } from "@/services/action-tasks";
import { STRATEGIC_RELATIONSHIP_ROLES } from "@/services/stakeholder-coverage";

export type InternalGoalDirection = "at_least" | "at_most";
export type InternalGoalStatus = "achieved" | "attention" | "no_data";

export type InternalGoalDefinition = {
  key: InternalGoalKey;
  label: string;
  description: string;
  unit: "percent" | "hours";
  direction: InternalGoalDirection;
  window: string;
};

export type InternalGoalResult = InternalGoalDefinition & {
  actual: number | null;
  target: number;
  baseline: number | null;
  progress: number | null;
  status: InternalGoalStatus;
};

export const INTERNAL_GOAL_DEFINITIONS: InternalGoalDefinition[] = [
  { key: "portfolio_on_track", label: "Carteira em dia", description: "Clientes com contato recente e sem ação atrasada.", unit: "percent", direction: "at_least", window: "Recência vigente do Health Score" },
  { key: "actions_on_time", label: "Ações concluídas no prazo", description: "Conclusões realizadas até a data limite.", unit: "percent", direction: "at_least", window: "Últimos 30 dias" },
  { key: "strategic_stakeholder_coverage", label: "Cobertura de stakeholders estratégicos", description: "Cobertura dos quatro papéis estratégicos por cliente.", unit: "percent", direction: "at_least", window: "Situação atual" },
  { key: "risk_client_reduction", label: "Redução de clientes em risco", description: "Redução frente à linha de base registrada.", unit: "percent", direction: "at_least", window: "Situação atual versus linha de base" },
  { key: "alert_response_time", label: "Tempo de resposta a alertas", description: "Tempo médio até a leitura, incluindo alertas ainda abertos.", unit: "hours", direction: "at_most", window: "Últimos 30 dias" },
  { key: "updated_success_plans", label: "Planos de sucesso atualizados", description: "Clientes com plano ativo atualizado recentemente.", unit: "percent", direction: "at_least", window: "Últimos 90 dias" },
];

export const DEFAULT_INTERNAL_GOALS: InternalGoal[] = [
  ["portfolio_on_track", 90],
  ["actions_on_time", 90],
  ["strategic_stakeholder_coverage", 75],
  ["risk_client_reduction", 20],
  ["alert_response_time", 24],
  ["updated_success_plans", 90],
].map(([key, target]) => ({
  key: key as InternalGoalKey,
  target_value: Number(target),
  baseline_value: null,
  updated_by: null,
  created_at: "",
  updated_at: "",
}));

function datePart(value: string) {
  return value.slice(0, 10);
}

function utcDay(value: string) {
  const [year, month, day] = datePart(value).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function daysBetween(later: string, earlier: string) {
  return Math.floor((utcDay(later) - utcDay(earlier)) / 86_400_000);
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function percent(numerator: number, denominator: number) {
  return denominator > 0 ? roundOne((numerator / denominator) * 100) : null;
}

export function validateInternalGoalTarget(key: InternalGoalKey, value: number) {
  if (!Number.isFinite(value)) return false;
  return key === "alert_response_time"
    ? value >= 1 && value <= 720
    : value >= 0 && value <= 100;
}

function resultFor(definition: InternalGoalDefinition, goal: InternalGoal, actual: number | null): InternalGoalResult {
  const target = Number(goal.target_value);
  const achieved = actual !== null && (definition.direction === "at_least" ? actual >= target : actual <= target);
  const progress = actual === null
    ? null
    : definition.direction === "at_least"
      ? target === 0 ? 100 : Math.max(0, Math.min(100, roundOne((actual / target) * 100)))
      : actual === 0 ? 100 : Math.max(0, Math.min(100, roundOne((target / actual) * 100)));
  return {
    ...definition,
    actual,
    target,
    baseline: goal.baseline_value === null ? null : Number(goal.baseline_value),
    progress,
    status: actual === null ? "no_data" : achieved ? "achieved" : "attention",
  };
}

export function buildInternalGoals({
  clients,
  interactions,
  tasks,
  events,
  stakeholders,
  risks,
  notifications,
  successPlans,
  goals,
  referenceAt,
  staleAfterDays,
}: {
  clients: Client[];
  interactions: InteractionView[];
  tasks: ActionTask[];
  events: ActionTaskEvent[];
  stakeholders: StakeholderHealth[];
  risks: ClientRiskOpportunity[];
  notifications: Notification[];
  successPlans: ClientSuccessPlan[];
  goals: InternalGoal[];
  referenceAt: string;
  staleAfterDays: number;
}): { results: InternalGoalResult[]; currentRiskClients: number } {
  const referenceDate = datePart(referenceAt);
  const referenceTime = new Date(referenceAt).getTime();
  const activeClients = clients.filter((client) => client.active);
  const activeClientIds = new Set(activeClients.map((client) => client.id));
  const latestInteraction = new Map<string, string>();
  for (const interaction of interactions) {
    if (!activeClientIds.has(interaction.client_id)) continue;
    const previous = latestInteraction.get(interaction.client_id);
    if (!previous || interaction.occurred_at > previous) latestInteraction.set(interaction.client_id, interaction.occurred_at);
  }
  const overdueClientIds = new Set(tasks
    .filter((task) => activeClientIds.has(task.client_id) && isActionTaskOverdue(task.status, task.due_date, referenceDate))
    .map((task) => task.client_id));
  const portfolioOnTrack = percent(activeClients.filter((client) => {
    const last = latestInteraction.get(client.id);
    if (!last) return false;
    const recencyDays = daysBetween(referenceDate, last);
    return recencyDays >= 0 && recencyDays <= staleAfterDays && !overdueClientIds.has(client.id);
  }).length, activeClients.length);

  const thirtyDayStart = referenceTime - (30 * 86_400_000);
  const taskById = new Map(tasks.filter((task) => activeClientIds.has(task.client_id)).map((task) => [task.id, task]));
  const completions = events.filter((event) => event.event_type === "completed"
    && taskById.has(event.task_id)
    && new Date(event.created_at).getTime() >= thirtyDayStart
    && new Date(event.created_at).getTime() <= referenceTime);
  const actionsOnTime = percent(completions.filter((event) => datePart(event.created_at) <= event.due_date).length, completions.length);

  const coveredRoleSlots = activeClients.reduce((sum, client) => {
    const roles = new Set(stakeholders
      .filter((stakeholder) => stakeholder.client_id === client.id && stakeholder.relationship_role && STRATEGIC_RELATIONSHIP_ROLES.includes(stakeholder.relationship_role))
      .map((stakeholder) => stakeholder.relationship_role));
    return sum + roles.size;
  }, 0);
  const stakeholderCoverage = percent(coveredRoleSlots, activeClients.length * STRATEGIC_RELATIONSHIP_ROLES.length);

  const currentRiskClients = new Set(risks.filter((risk) =>
    activeClientIds.has(risk.client_id)
    && risk.kind === "risco"
    && (risk.status === "aberto" || risk.status === "em_andamento")
    && (risk.impact === "alto" || risk.probability === "alta"),
  ).map((risk) => risk.client_id)).size;

  const alerts = notifications.filter((notification) => {
    const created = new Date(notification.created_at).getTime();
    return created >= thirtyDayStart && created <= referenceTime;
  });
  const alertResponseTime = alerts.length > 0
    ? roundOne(alerts.reduce((sum, notification) => {
      const created = new Date(notification.created_at).getTime();
      const responded = notification.read_at ? Math.min(referenceTime, new Date(notification.read_at).getTime()) : referenceTime;
      return sum + Math.max(0, responded - created) / 3_600_000;
    }, 0) / alerts.length)
    : null;

  const ninetyDayStart = referenceTime - (90 * 86_400_000);
  const updatedPlanClients = new Set(successPlans.filter((plan) =>
    activeClientIds.has(plan.client_id)
    && plan.status === "ativo"
    && new Date(plan.updated_at).getTime() >= ninetyDayStart
    && new Date(plan.updated_at).getTime() <= referenceTime,
  ).map((plan) => plan.client_id));
  const updatedSuccessPlans = percent(updatedPlanClients.size, activeClients.length);

  const goalByKey = new Map([...DEFAULT_INTERNAL_GOALS, ...goals].map((goal) => [goal.key, goal]));
  const actualByKey: Record<InternalGoalKey, number | null> = {
    portfolio_on_track: portfolioOnTrack,
    actions_on_time: actionsOnTime,
    strategic_stakeholder_coverage: stakeholderCoverage,
    risk_client_reduction: null,
    alert_response_time: alertResponseTime,
    updated_success_plans: updatedSuccessPlans,
  };
  const riskGoal = goalByKey.get("risk_client_reduction")!;
  const baseline = Number(riskGoal.baseline_value);
  if (riskGoal.baseline_value !== null && baseline > 0) {
    actualByKey.risk_client_reduction = roundOne(((baseline - currentRiskClients) / baseline) * 100);
  }

  return {
    results: INTERNAL_GOAL_DEFINITIONS.map((definition) => resultFor(definition, goalByKey.get(definition.key)!, actualByKey[definition.key])),
    currentRiskClients,
  };
}
