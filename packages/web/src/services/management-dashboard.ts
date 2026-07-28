import type {
  ActionTask,
  ActionTaskEvent,
  Client,
  ClientCommercialPlan,
  DeepManager,
  InteractionView,
  StakeholderHealth,
  StakeholderRelationshipRole,
} from "@/lib/types/database";
import { isActionTaskOverdue } from "@/services/action-tasks";
import {
  buildStakeholderCoverage,
  STRATEGIC_RELATIONSHIP_ROLES,
} from "@/services/stakeholder-coverage";

const ACTIVE_ACTION_STATUSES = new Set<ActionTask["status"]>([
  "pending",
  "in_progress",
  "postponed",
]);

const OPEN_COMMERCIAL_STATUSES = new Set<ClientCommercialPlan["status"]>([
  "nao_iniciado",
  "em_preparacao",
  "em_negociacao",
]);

export type NamedCount = { name: string; count: number };

export type ManagementDashboardSummary = {
  clientsByOwner: NamedCount[];
  interactionsByOwner: NamedCount[];
  actions: {
    open: number;
    completed: number;
    overdue: number;
    averageResolutionDays: number;
  };
  clientsWithoutNextAction: Client[];
  stakeholderCoverage: {
    percent: number;
    concentratedClients: number;
    byRole: Array<{ role: StakeholderRelationshipRole; clients: number; percent: number }>;
  };
  revenueAtRisk: number;
  alerts: { untreated: number; overdue: number };
  monthlyEvolution: Array<{
    key: string;
    label: string;
    interactions: number;
    completedActions: number;
  }>;
};

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function sortedCounts(counts: Map<string, number>): NamedCount[] {
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "pt-BR"));
}

function monthKey(value: string) {
  return value.slice(0, 7);
}

function buildMonths(referenceDate: string, monthCount: number) {
  const [year, month] = referenceDate.slice(0, 7).split("-").map(Number);
  return Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(Date.UTC(year, month - monthCount + index, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("pt-BR", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }).format(date).replace(" de ", "/");
    return { key, label, interactions: 0, completedActions: 0 };
  });
}

export function buildManagementDashboard({
  clients,
  managers,
  interactions,
  tasks,
  events,
  stakeholders,
  commercialPlans,
  referenceDate,
  monthCount = 6,
}: {
  clients: Client[];
  managers: DeepManager[];
  interactions: InteractionView[];
  tasks: ActionTask[];
  events: ActionTaskEvent[];
  stakeholders: StakeholderHealth[];
  commercialPlans: ClientCommercialPlan[];
  referenceDate: string;
  monthCount?: number;
}): ManagementDashboardSummary {
  const activeClients = clients.filter((client) => client.active);
  const activeClientIds = new Set(activeClients.map((client) => client.id));
  const managerNames = new Map(managers.map((manager) => [manager.id, manager.name]));

  const clientsByOwner = new Map<string, number>();
  for (const client of activeClients) {
    const name = client.owner_manager_id
      ? managerNames.get(client.owner_manager_id) ?? "Responsável inativo"
      : "Sem responsável";
    clientsByOwner.set(name, (clientsByOwner.get(name) ?? 0) + 1);
  }

  const interactionsByOwner = new Map<string, number>();
  for (const interaction of interactions) {
    if (!activeClientIds.has(interaction.client_id)) continue;
    const name = interaction.manager_name ?? "Sem responsável";
    interactionsByOwner.set(name, (interactionsByOwner.get(name) ?? 0) + 1);
  }

  const portfolioTasks = tasks.filter((task) => activeClientIds.has(task.client_id));
  const portfolioTaskIds = new Set(portfolioTasks.map((task) => task.id));
  const openTasks = portfolioTasks.filter((task) => ACTIVE_ACTION_STATUSES.has(task.status));
  const completedTasks = portfolioTasks.filter((task) => task.status === "completed");
  const overdueTasks = openTasks.filter((task) => isActionTaskOverdue(task.status, task.due_date, referenceDate));
  const activeTaskClientIds = new Set(openTasks.map((task) => task.client_id));

  const latestCompletionByTask = new Map<string, string>();
  for (const event of events) {
    if (event.event_type !== "completed") continue;
    const previous = latestCompletionByTask.get(event.task_id);
    if (!previous || event.created_at > previous) latestCompletionByTask.set(event.task_id, event.created_at);
  }
  const resolutionDays = completedTasks.flatMap((task) => {
    const completedAt = latestCompletionByTask.get(task.id);
    if (!completedAt) return [];
    const duration = new Date(completedAt).getTime() - new Date(task.created_at).getTime();
    return duration >= 0 ? [duration / 86_400_000] : [];
  });

  const roleCounts = new Map<StakeholderRelationshipRole, number>(
    STRATEGIC_RELATIONSHIP_ROLES.map((role) => [role, 0]),
  );
  let concentratedClients = 0;
  for (const client of activeClients) {
    const coverage = buildStakeholderCoverage(
      stakeholders.filter((stakeholder) => stakeholder.client_id === client.id),
    );
    if (coverage.isRelationshipConcentrated) concentratedClients += 1;
    for (const role of coverage.coveredRoles) roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }
  const totalRoleSlots = activeClients.length * STRATEGIC_RELATIONSHIP_ROLES.length;
  const coveredRoleSlots = [...roleCounts.values()].reduce((sum, count) => sum + count, 0);

  const clientById = new Map(activeClients.map((client) => [client.id, client]));
  const revenueAtRisk = commercialPlans.reduce((sum, plan) => {
    if (!OPEN_COMMERCIAL_STATUSES.has(plan.status)) return sum;
    const client = clientById.get(plan.client_id);
    if (!client) return sum;
    const probability = Math.min(100, Math.max(0, Number(plan.probability))) / 100;
    return sum + Number(client.contract_value ?? 0) * (1 - probability);
  }, 0);

  const highPriorityOpen = openTasks.filter((task) => task.priority === "alta");
  const months = buildMonths(referenceDate, Math.max(1, monthCount));
  const monthByKey = new Map(months.map((month) => [month.key, month]));
  for (const interaction of interactions) {
    const month = monthByKey.get(monthKey(interaction.occurred_at));
    if (month && activeClientIds.has(interaction.client_id)) month.interactions += 1;
  }
  for (const event of events) {
    if (event.event_type !== "completed" || !portfolioTaskIds.has(event.task_id)) continue;
    const month = monthByKey.get(monthKey(event.created_at));
    if (month) month.completedActions += 1;
  }

  return {
    clientsByOwner: sortedCounts(clientsByOwner),
    interactionsByOwner: sortedCounts(interactionsByOwner),
    actions: {
      open: openTasks.length,
      completed: completedTasks.length,
      overdue: overdueTasks.length,
      averageResolutionDays: resolutionDays.length > 0
        ? roundOne(resolutionDays.reduce((sum, days) => sum + days, 0) / resolutionDays.length)
        : 0,
    },
    clientsWithoutNextAction: activeClients
      .filter((client) => !activeTaskClientIds.has(client.id))
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
    stakeholderCoverage: {
      percent: totalRoleSlots > 0 ? Math.round((coveredRoleSlots / totalRoleSlots) * 100) : 0,
      concentratedClients,
      byRole: STRATEGIC_RELATIONSHIP_ROLES.map((role) => ({
        role,
        clients: roleCounts.get(role) ?? 0,
        percent: activeClients.length > 0
          ? Math.round(((roleCounts.get(role) ?? 0) / activeClients.length) * 100)
          : 0,
      })),
    },
    revenueAtRisk: roundOne(revenueAtRisk),
    alerts: {
      untreated: highPriorityOpen.length,
      overdue: highPriorityOpen.filter((task) =>
        isActionTaskOverdue(task.status, task.due_date, referenceDate),
      ).length,
    },
    monthlyEvolution: months,
  };
}
