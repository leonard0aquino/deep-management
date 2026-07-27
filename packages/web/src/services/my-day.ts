import type { DashboardData } from "@/lib/data";
import type { ActionTask, DeepManager, InteractionView, Notification } from "@/lib/types/database";

const OPEN_TASK_STATUSES = new Set<ActionTask["status"]>(["pending", "in_progress", "postponed"]);

export type MyDaySummary = {
  scope: "personal" | "operation";
  manager: DeepManager | null;
  tasksToday: ActionTask[];
  overdueTasks: ActionTask[];
  staleClients: DashboardData["clientHealth"];
  upcomingRenewals: Array<DashboardData["clients"][number] & { daysRemaining: number }>;
  meetingsToPrepare: InteractionView[];
  unreadNotifications: Notification[];
  recentInteractions: InteractionView[];
};

function dateParts(value: string): [number, number, number] {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return [year, month, day];
}

export function addCivilDays(value: string, days: number): string {
  const [year, month, day] = dateParts(value);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function civilDaysBetween(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = dateParts(from);
  const [toYear, toMonth, toDay] = dateParts(to);
  return Math.round(
    (Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / 86_400_000,
  );
}

export function todayInSaoPaulo(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function buildMyDaySummary({
  userId,
  today,
  tasks,
  notifications,
  data,
}: {
  userId: string;
  today: string;
  tasks: ActionTask[];
  notifications: Notification[];
  data: DashboardData;
}): MyDaySummary {
  const manager = data.managers.find((item) => item.active && item.linked_user_id === userId) ?? null;
  const scopedClientIds = new Set(data.clients
    .filter((client) => !manager || client.owner_manager_id === manager.id)
    .map((client) => client.id));
  if (manager) {
    const unownedClientIds = new Set(data.clients
      .filter((client) => !client.owner_manager_id)
      .map((client) => client.id));
    data.interactions
      .filter((interaction) => interaction.manager_id === manager.id && unownedClientIds.has(interaction.client_id))
      .forEach((interaction) => scopedClientIds.add(interaction.client_id));
  }
  const scopedInteractions = manager
    ? data.interactions.filter((interaction) => scopedClientIds.has(interaction.client_id))
    : data.interactions;
  const daySeven = addCivilDays(today, 7);
  const dayNinety = addCivilDays(today, 90);

  const openTasks = tasks
    .filter((task) => task.assigned_to === userId && OPEN_TASK_STATUSES.has(task.status))
    .sort((left, right) => left.due_date.localeCompare(right.due_date));

  const staleClients = data.clientHealth
    .filter((client) => scopedClientIds.has(client.client_id) && client.days_since_last_contact > 30)
    .sort((left, right) => right.days_since_last_contact - left.days_since_last_contact);

  const upcomingRenewals = data.clients
    .filter((client) => {
      const renewal = client.contract_renewal_date;
      return scopedClientIds.has(client.id) && renewal !== null && renewal >= today && renewal <= dayNinety;
    })
    .map((client) => ({
      ...client,
      daysRemaining: civilDaysBetween(today, client.contract_renewal_date!),
    }))
    .sort((left, right) => left.contract_renewal_date!.localeCompare(right.contract_renewal_date!));

  const meetingsToPrepare = scopedInteractions
    .filter((interaction) => (
      interaction.interaction_type === "meeting"
      && interaction.occurred_at >= today
      && interaction.occurred_at <= daySeven
    ))
    .sort((left, right) => left.occurred_at.localeCompare(right.occurred_at));

  const recentInteractions = scopedInteractions
    .filter((interaction) => interaction.occurred_at <= today)
    .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at))
    .slice(0, 6);

  return {
    scope: manager ? "personal" : "operation",
    manager,
    tasksToday: openTasks.filter((task) => task.due_date === today),
    overdueTasks: openTasks.filter((task) => task.due_date < today),
    staleClients,
    upcomingRenewals,
    meetingsToPrepare,
    unreadNotifications: notifications.filter((notification) => !notification.read).slice(0, 8),
    recentInteractions,
  };
}
