import type {
  ActionTask,
  ActionTaskEvent,
  Client,
  ClientCommercialPlan,
  ClientRiskOpportunity,
  DeepManager,
  InteractionView,
} from "@/lib/types/database";
import type { DataQualityPortfolio } from "@/services/data-quality";
import { isActionTaskOverdue } from "@/services/action-tasks";
import { addCivilDays, civilDaysBetween } from "@/services/my-day";
import { buildRenewalPortfolioSummary, type RenewalPortfolioSummary } from "@/services/renewal-expansion";
import { getPriorityLabel, getPriorityScore, isPortfolioItemClosed, sortPortfolioItems } from "@/services/risk-opportunities";

const ACTIVE_TASK_STATUSES = new Set<ActionTask["status"]>(["pending", "in_progress", "postponed"]);
export const EXECUTIVE_REPORT_PERIODS = [7, 30, 90] as const;
export type ExecutiveReportPeriod = (typeof EXECUTIVE_REPORT_PERIODS)[number];

export type ExecutiveReportChange = {
  id: string;
  occurredAt: string;
  kind: "interaction" | "action" | "portfolio" | "commercial";
  label: string;
  detail: string;
  clientId: string;
  clientName: string;
};

export type ExecutiveReportPortfolioItem = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  impact: ClientRiskOpportunity["impact"];
  probability: ClientRiskOpportunity["probability"];
  priority: ReturnType<typeof getPriorityLabel>;
  ownerName: string;
  targetDate: string;
  overdue: boolean;
};

export type ExecutiveReportDecision = {
  id: string;
  kind: "owner" | "risk" | "renewal" | "overdue_action";
  clientId: string;
  clientName: string;
  title: string;
  rationale: string;
};

export type ExecutiveReport = {
  period: { days: ExecutiveReportPeriod; start: string; end: string };
  generatedAt: string;
  summary: {
    activeClients: number;
    healthScore: number;
    dataQualityScore: number;
    activeContractValue: number;
    clientsWithoutNextAction: number;
  };
  changes: {
    interactions: number;
    actionUpdates: number;
    portfolioUpdates: number;
    commercialUpdates: number;
    total: number;
    timeline: ExecutiveReportChange[];
  };
  risks: ExecutiveReportPortfolioItem[];
  opportunities: ExecutiveReportPortfolioItem[];
  renewals: RenewalPortfolioSummary["upcoming"];
  overdueActions: Array<{
    task: ActionTask;
    ownerName: string;
    daysOverdue: number;
  }>;
  decisions: ExecutiveReportDecision[];
};

export function normalizeExecutiveReportPeriod(value: string | number | null | undefined): ExecutiveReportPeriod {
  const number = Number(value);
  return EXECUTIVE_REPORT_PERIODS.includes(number as ExecutiveReportPeriod)
    ? number as ExecutiveReportPeriod
    : 7;
}

function inPeriod(value: string, start: string, end: string) {
  const date = value.slice(0, 10);
  return date >= start && date <= end;
}

const EVENT_LABELS: Partial<Record<ActionTaskEvent["event_type"], string>> = {
  completed: "Ação concluída",
  reopened: "Ação reaberta",
  postponed: "Ação adiada",
};

export function buildExecutiveReport({
  clients,
  interactions,
  portfolioItems,
  commercialPlans,
  tasks,
  events,
  managers,
  healthScore,
  dataQuality,
  referenceDate,
  generatedAt,
  periodDays,
}: {
  clients: Client[];
  interactions: InteractionView[];
  portfolioItems: ClientRiskOpportunity[];
  commercialPlans: ClientCommercialPlan[];
  tasks: ActionTask[];
  events: ActionTaskEvent[];
  managers: DeepManager[];
  healthScore: number;
  dataQuality: DataQualityPortfolio;
  referenceDate: string;
  generatedAt: string;
  periodDays: ExecutiveReportPeriod;
}): ExecutiveReport {
  const activeClients = clients.filter((client) => client.active);
  const activeClientIds = new Set(activeClients.map((client) => client.id));
  const start = addCivilDays(referenceDate, -(periodDays - 1));
  const clientById = new Map(activeClients.map((client) => [client.id, client]));
  const managerById = new Map(managers.map((manager) => [manager.id, manager.name]));
  const managerByUserId = new Map(managers.flatMap((manager) => manager.linked_user_id ? [[manager.linked_user_id, manager.name] as const] : []));
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const renewal = buildRenewalPortfolioSummary(activeClients, commercialPlans, referenceDate);

  const interactionChanges: ExecutiveReportChange[] = interactions
    .filter((item) => activeClientIds.has(item.client_id) && inPeriod(item.occurred_at, start, referenceDate))
    .map((item) => ({ id: `interaction-${item.id}`, occurredAt: item.occurred_at, kind: "interaction", label: "Interação registrada", detail: item.topic, clientId: item.client_id, clientName: item.client_name }));
  const actionChanges: ExecutiveReportChange[] = events.flatMap((event) => {
    const label = EVENT_LABELS[event.event_type];
    const task = taskById.get(event.task_id);
    if (!label || !task || !activeClientIds.has(task.client_id) || !inPeriod(event.created_at, start, referenceDate)) return [];
    return [{ id: `event-${event.id}`, occurredAt: event.created_at, kind: "action" as const, label, detail: task.reason, clientId: task.client_id, clientName: task.client_name }];
  });
  const portfolioChanges: ExecutiveReportChange[] = portfolioItems
    .filter((item) => activeClientIds.has(item.client_id) && inPeriod(item.updated_at, start, referenceDate))
    .map((item) => ({ id: `portfolio-${item.id}`, occurredAt: item.updated_at, kind: "portfolio", label: item.kind === "risco" ? "Risco atualizado" : "Oportunidade atualizada", detail: item.title, clientId: item.client_id, clientName: clientById.get(item.client_id)?.name ?? "Cliente" }));
  const commercialChanges: ExecutiveReportChange[] = commercialPlans
    .filter((plan) => activeClientIds.has(plan.client_id) && inPeriod(plan.updated_at, start, referenceDate))
    .map((plan) => ({ id: `commercial-${plan.id}`, occurredAt: plan.updated_at, kind: "commercial", label: "Plano comercial atualizado", detail: `${plan.probability}% de probabilidade`, clientId: plan.client_id, clientName: clientById.get(plan.client_id)?.name ?? "Cliente" }));

  const toPortfolioItem = (item: ClientRiskOpportunity): ExecutiveReportPortfolioItem => ({
    id: item.id,
    clientId: item.client_id,
    clientName: clientById.get(item.client_id)?.name ?? "Cliente",
    title: item.title,
    impact: item.impact,
    probability: item.probability,
    priority: getPriorityLabel(getPriorityScore(item)),
    ownerName: managerById.get(item.owner_manager_id) ?? "Responsável não encontrado",
    targetDate: item.target_date,
    overdue: item.target_date < referenceDate,
  });
  const openPortfolioItems = sortPortfolioItems(portfolioItems.filter((item) => activeClientIds.has(item.client_id) && !isPortfolioItemClosed(item)));
  const overdueActions = tasks
    .filter((task) => activeClientIds.has(task.client_id) && isActionTaskOverdue(task.status, task.due_date, referenceDate))
    .sort((left, right) => left.due_date.localeCompare(right.due_date) || (left.priority === right.priority ? 0 : left.priority === "alta" ? -1 : 1))
    .map((task) => ({ task, ownerName: task.assigned_to ? managerByUserId.get(task.assigned_to) ?? "Responsável não encontrado" : "Sem responsável", daysOverdue: civilDaysBetween(task.due_date, referenceDate) }));
  const activeTaskClientIds = new Set(tasks.filter((task) => ACTIVE_TASK_STATUSES.has(task.status)).map((task) => task.client_id));

  const decisions: ExecutiveReportDecision[] = [];
  for (const client of activeClients.filter((item) => !item.owner_manager_id)) {
    decisions.push({ id: `owner-${client.id}`, kind: "owner", clientId: client.id, clientName: client.name, title: "Definir responsável da conta", rationale: "A conta está ativa sem responsável principal." });
  }
  for (const item of openPortfolioItems.filter((entry) => entry.kind === "risco" && getPriorityScore(entry) >= 7)) {
    decisions.push({ id: `risk-${item.id}`, kind: "risk", clientId: item.client_id, clientName: clientById.get(item.client_id)?.name ?? "Cliente", title: `Direcionar mitigação: ${item.title}`, rationale: `Risco com prioridade ${getPriorityLabel(getPriorityScore(item)).toLowerCase()} (${getPriorityScore(item)}/9).` });
  }
  for (const entry of renewal.upcoming.filter((item) => item.daysRemaining <= 90 && (!item.plan || Number(item.plan.probability) < 50))) {
    decisions.push({ id: `renewal-${entry.client.id}`, kind: "renewal", clientId: entry.client.id, clientName: entry.client.name, title: "Direcionar estratégia de renovação", rationale: entry.plan ? `Renovação em ${entry.daysRemaining} dias com probabilidade de ${entry.plan.probability}%.` : `Renovação em ${entry.daysRemaining} dias sem plano comercial.` });
  }
  for (const entry of overdueActions.filter((item) => item.task.priority === "alta")) {
    decisions.push({ id: `action-${entry.task.id}`, kind: "overdue_action", clientId: entry.task.client_id, clientName: entry.task.client_name, title: `Destravar ação: ${entry.task.reason}`, rationale: `Ação de prioridade alta atrasada há ${entry.daysOverdue} dia(s).` });
  }

  const allChanges = [...interactionChanges, ...actionChanges, ...portfolioChanges, ...commercialChanges]
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || left.label.localeCompare(right.label, "pt-BR"));

  return {
    period: { days: periodDays, start, end: referenceDate },
    generatedAt,
    summary: {
      activeClients: activeClients.length,
      healthScore: Math.round(Math.min(100, Math.max(0, Number(healthScore) || 0))),
      dataQualityScore: dataQuality.averageScore,
      activeContractValue: renewal.activeContractValue,
      clientsWithoutNextAction: activeClients.filter((client) => !activeTaskClientIds.has(client.id)).length,
    },
    changes: { interactions: interactionChanges.length, actionUpdates: actionChanges.length, portfolioUpdates: portfolioChanges.length, commercialUpdates: commercialChanges.length, total: allChanges.length, timeline: allChanges.slice(0, 20) },
    risks: openPortfolioItems.filter((item) => item.kind === "risco").map(toPortfolioItem),
    opportunities: openPortfolioItems.filter((item) => item.kind === "oportunidade").map(toPortfolioItem),
    renewals: renewal.upcoming,
    overdueActions,
    decisions,
  };
}
