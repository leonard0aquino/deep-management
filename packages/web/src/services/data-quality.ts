import type {
  ActionTask,
  Client,
  ClientCommercialPlan,
  ClientSuccessPlan,
  InteractionView,
  StakeholderHealth,
} from "@/lib/types/database";
import { STRATEGIC_RELATIONSHIP_ROLES } from "@/services/stakeholder-coverage";

const ACTIVE_TASK_STATUSES = new Set<ActionTask["status"]>([
  "pending",
  "in_progress",
  "postponed",
]);

export type DataQualityIssueKey =
  | "owner"
  | "recent_interaction"
  | "key_stakeholder"
  | "next_step"
  | "commercial_data"
  | "objective"
  | "stale_data"
  | "incomplete_interaction";

export type DataQualityIssue = {
  key: DataQualityIssueKey;
  label: string;
  description: string;
};

export type ClientDataQualityReport = {
  client: Client;
  score: number;
  passedChecks: number;
  totalChecks: 8;
  issues: DataQualityIssue[];
};

export type DataQualityPortfolio = {
  averageScore: number;
  activeClients: number;
  completeClients: number;
  reports: ClientDataQualityReport[];
  issueCounts: Array<DataQualityIssue & { count: number }>;
};

const ISSUE_DEFINITIONS: Record<DataQualityIssueKey, Omit<DataQualityIssue, "key">> = {
  owner: {
    label: "Sem responsável",
    description: "Defina o responsável principal pela conta.",
  },
  recent_interaction: {
    label: "Sem interação recente",
    description: "Registre uma interação dentro da janela de acompanhamento.",
  },
  key_stakeholder: {
    label: "Sem stakeholder-chave",
    description: "Classifique ao menos um contato em um papel estratégico.",
  },
  next_step: {
    label: "Sem próximo passo",
    description: "Mantenha uma tarefa ativa ou um próximo passo futuro.",
  },
  commercial_data: {
    label: "Sem valor ou renovação",
    description: "Preencha valor contratual positivo e data de renovação.",
  },
  objective: {
    label: "Sem objetivo definido",
    description: "Registre o objetivo no plano de sucesso do cliente.",
  },
  stale_data: {
    label: "Dados desatualizados",
    description: "Atualize uma evidência operacional da conta.",
  },
  incomplete_interaction: {
    label: "Interação sem notas ou resultado",
    description: "Complete notas e ao menos um resultado estruturado da interação.",
  },
};

function issue(key: DataQualityIssueKey): DataQualityIssue {
  return { key, ...ISSUE_DEFINITIONS[key] };
}

function datePart(value: string | null | undefined) {
  return value?.slice(0, 10) ?? null;
}

function daysBetween(later: string, earlier: string) {
  const toUtc = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.floor((toUtc(later) - toUtc(earlier)) / 86_400_000);
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function latestDate(values: Array<string | null | undefined>) {
  return values.reduce<string | null>((latest, value) => {
    const candidate = datePart(value);
    return candidate && (!latest || candidate > latest) ? candidate : latest;
  }, null);
}

export function buildClientDataQuality({
  client,
  interactions,
  stakeholders,
  successPlans,
  tasks,
  commercialPlans,
  referenceDate,
  staleAfterDays,
}: {
  client: Client;
  interactions: InteractionView[];
  stakeholders: StakeholderHealth[];
  successPlans: ClientSuccessPlan[];
  tasks: ActionTask[];
  commercialPlans: ClientCommercialPlan[];
  referenceDate: string;
  staleAfterDays: number;
}): ClientDataQualityReport {
  const issues: DataQualityIssue[] = [];
  const clientInteractions = interactions.filter((item) => item.client_id === client.id);
  const clientStakeholders = stakeholders.filter((item) => item.client_id === client.id);
  const clientPlans = successPlans.filter((item) => item.client_id === client.id);
  const clientTasks = tasks.filter((item) => item.client_id === client.id);
  const clientCommercialPlans = commercialPlans.filter((item) => item.client_id === client.id);

  if (!client.owner_manager_id) issues.push(issue("owner"));

  const latestInteraction = latestDate(clientInteractions.map((item) => item.occurred_at));
  if (!latestInteraction || daysBetween(referenceDate, latestInteraction) > staleAfterDays) {
    issues.push(issue("recent_interaction"));
  }

  const hasKeyStakeholder = clientStakeholders.some((item) =>
    item.relationship_role !== null && STRATEGIC_RELATIONSHIP_ROLES.includes(item.relationship_role),
  );
  if (!hasKeyStakeholder) issues.push(issue("key_stakeholder"));

  const hasActiveTask = clientTasks.some((item) => ACTIVE_TASK_STATUSES.has(item.status));
  const hasFutureInteractionStep = clientInteractions.some((item) =>
    hasText(item.next_step)
    && Boolean(item.next_step_due_date)
    && item.next_step_due_date! >= referenceDate,
  );
  if (!hasActiveTask && !hasFutureInteractionStep) issues.push(issue("next_step"));

  if (!(Number(client.contract_value) > 0) || !client.contract_renewal_date) {
    issues.push(issue("commercial_data"));
  }

  if (!clientPlans.some((item) => hasText(item.objective))) issues.push(issue("objective"));

  const lastOperationalUpdate = latestDate([
    client.created_at,
    ...clientInteractions.flatMap((item) => [item.updated_at, item.occurred_at]),
    ...clientPlans.map((item) => item.updated_at),
    ...clientCommercialPlans.map((item) => item.updated_at),
    ...clientStakeholders.flatMap((item) => [item.sentiment_recorded_at, item.last_contact]),
  ]);
  if (!lastOperationalUpdate || daysBetween(referenceDate, lastOperationalUpdate) > staleAfterDays) {
    issues.push(issue("stale_data"));
  }

  const hasIncompleteInteraction = clientInteractions.some((item) => {
    const hasResult = [item.decisions, item.next_step, item.risks, item.opportunities].some(hasText);
    return !hasText(item.notes) || !hasResult;
  });
  if (hasIncompleteInteraction) issues.push(issue("incomplete_interaction"));

  const passedChecks = 8 - issues.length;
  return {
    client,
    score: Math.round((passedChecks / 8) * 100),
    passedChecks,
    totalChecks: 8,
    issues,
  };
}

export function buildDataQualityPortfolio(input: {
  clients: Client[];
  interactions: InteractionView[];
  stakeholders: StakeholderHealth[];
  successPlans: ClientSuccessPlan[];
  tasks: ActionTask[];
  commercialPlans: ClientCommercialPlan[];
  referenceDate: string;
  staleAfterDays: number;
}): DataQualityPortfolio {
  const reports = input.clients
    .filter((client) => client.active)
    .map((client) => buildClientDataQuality({ ...input, client }))
    .sort((left, right) => left.score - right.score || left.client.name.localeCompare(right.client.name, "pt-BR"));
  const issueCounts = (Object.keys(ISSUE_DEFINITIONS) as DataQualityIssueKey[]).map((key) => ({
    key,
    ...ISSUE_DEFINITIONS[key],
    count: reports.filter((report) => report.issues.some((item) => item.key === key)).length,
  }));
  const scoreSum = reports.reduce((sum, report) => sum + report.score, 0);

  return {
    averageScore: reports.length > 0 ? Math.round(scoreSum / reports.length) : 100,
    activeClients: reports.length,
    completeClients: reports.filter((report) => report.score === 100).length,
    reports,
    issueCounts,
  };
}
