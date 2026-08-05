import { parseCsv } from "@/services/structured-import";
import type { JiraIssue } from "@/lib/types/database";

export type JiraImportIssue = { row: number; field: string; message: string };

export type JiraImportRow = {
  issue_key: string;
  jira_issue_id: string | null;
  summary: string;
  issue_type: string;
  status: string;
  status_category: string;
  priority: string | null;
  resolution: string | null;
  assignee_name: string | null;
  assignee_account_id: string | null;
  source_created_at: string | null;
  source_updated_at: string | null;
  source_resolved_at: string | null;
  due_at: string | null;
  parent_key: string | null;
};

export type JiraImportAnalysis = {
  projectKey: string | null;
  rows: JiraImportRow[];
  issues: JiraImportIssue[];
};

export const JIRA_PROJECTS = {
  SIN: "Sinergia",
  SIG: "Sigma",
  DB: "B.U.s DEEP",
  HP: "Hiperpag",
} as const;

export type JiraProjectKey = keyof typeof JIRA_PROJECTS;

export function isSupportedJiraProject(value: string | null): value is JiraProjectKey {
  return Boolean(value && value in JIRA_PROJECTS);
}

export function normalizeJiraProjectKey(value?: string | string[]): JiraProjectKey {
  const candidate = (Array.isArray(value) ? value[0] : value)?.toUpperCase() ?? null;
  return isSupportedJiraProject(candidate) ? candidate : "SIN";
}

const MONTHS: Record<string, number> = {
  jan: 1, fev: 2, feb: 2, mar: 3, abr: 4, apr: 4, mai: 5, may: 5,
  jun: 6, jul: 7, ago: 8, aug: 8, set: 9, sep: 9, out: 10, oct: 10,
  nov: 11, dez: 12, dec: 12,
};

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function validCalendarDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function jiraDate(value: string, dateOnly = false): string | null {
  if (!value.trim()) return null;
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly && isoDate) {
    return validCalendarDate(Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3])) ? value : null;
  }
  const isoDateTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  const iso = new Date(value);
  if (isoDateTime
    && validCalendarDate(Number(isoDateTime[1]), Number(isoDateTime[2]), Number(isoDateTime[3]))
    && Number(isoDateTime[4]) <= 23 && Number(isoDateTime[5]) <= 59
    && !Number.isNaN(iso.getTime())) {
    return dateOnly ? value.slice(0, 10) : iso.toISOString();
  }
  const match = /^(\d{1,2})\/([a-zç]{3})\/(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?$/i.exec(normalized(value));
  if (!match) return null;
  const month = MONTHS[match[2]];
  if (!month) return null;
  const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  const day = Number(match[1]);
  let hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const meridiem = match[6]?.toUpperCase();
  if (!validCalendarDate(year, month, day) || minute > 59 || (meridiem ? hour < 1 || hour > 12 : hour > 23)) return null;
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  if (dateOnly) return `${yyyy}-${mm}-${dd}`;
  return new Date(`${yyyy}-${mm}-${dd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`).toISOString();
}

function inferredStatusCategory(status: string, resolution: string) {
  if (resolution.trim() || normalized(status).includes("conclu")) return "Itens concluídos";
  if (normalized(status).includes("pendente")) return "Itens Pendentes";
  return "Em andamento";
}

export function analyzeJiraCsv(csv: string, expectedProjectKey?: string): JiraImportAnalysis {
  const parsed = parseCsv(csv);
  const issues: JiraImportIssue[] = [];
  const required = ["tipo de item", "chave da item", "id da item", "resumo", "status", "criado", "atualizado(a)"];
  for (const field of required) {
    if (!parsed.headers.includes(field)) issues.push({ row: 1, field, message: `Coluna obrigatória ausente: ${field}.` });
  }
  if (issues.length) return { projectKey: null, rows: [], issues };

  const keys = new Set<string>();
  let projectKey: string | null = expectedProjectKey?.toUpperCase() ?? null;
  const rows: JiraImportRow[] = [];

  for (const item of parsed.rows) {
    const value = item.values;
    const issueKey = value["chave da item"]?.trim().toUpperCase();
    const issueKeyMatch = /^([A-Z][A-Z0-9_]{1,15})-\d+$/.exec(issueKey ?? "");
    const keyProject = (value["chave do projeto"]?.trim() || issueKeyMatch?.[1] || "").toUpperCase();
    projectKey ??= keyProject || null;
    const requiredValues = [
      ["tipo de item", value["tipo de item"]], ["chave da item", issueKey], ["id da item", value["id da item"]],
      ["resumo", value.resumo], ["status", value.status], ["criado", value.criado], ["atualizado(a)", value["atualizado(a)"]],
    ];
    for (const [field, fieldValue] of requiredValues) {
      if (!fieldValue?.trim()) issues.push({ row: item.row, field, message: "Campo obrigatório não preenchido." });
    }
    if (!issueKeyMatch || issueKeyMatch[1] !== projectKey) {
      issues.push({ row: item.row, field: "chave da item", message: `A chave deve pertencer ao projeto ${projectKey ?? "identificado no arquivo"}.` });
    }
    if (keyProject !== projectKey) {
      issues.push({ row: item.row, field: "chave do projeto", message: `Projeto divergente: esperado ${projectKey}.` });
    }
    if (keys.has(issueKey)) issues.push({ row: item.row, field: "chave da item", message: "Chave duplicada no arquivo." });
    keys.add(issueKey);
    if (projectKey !== keyProject) issues.push({ row: item.row, field: "chave do projeto", message: "O arquivo contém mais de um projeto." });

    const createdAt = jiraDate(value.criado);
    const updatedAt = jiraDate(value["atualizado(a)"]);
    const resolvedAt = jiraDate(value.resolvido ?? "");
    const dueAt = jiraDate(value["data limite"] ?? "", true);
    if (value.criado && !createdAt) issues.push({ row: item.row, field: "criado", message: "Data de criação não reconhecida." });
    if (value["atualizado(a)"] && !updatedAt) issues.push({ row: item.row, field: "atualizado(a)", message: "Data de atualização não reconhecida." });
    if (value.resolvido && !resolvedAt) issues.push({ row: item.row, field: "resolvido", message: "Data de resolução não reconhecida." });
    if (value["data limite"] && !dueAt) issues.push({ row: item.row, field: "data limite", message: "Data limite não reconhecida." });

    const resolution = value.resolucao?.trim() ?? "";
    rows.push({
      issue_key: issueKey,
      jira_issue_id: value["id da item"]?.trim() || null,
      summary: value.resumo?.trim() ?? "",
      issue_type: value["tipo de item"]?.trim() ?? "",
      status: value.status?.trim() ?? "",
      status_category: value["categoria do status"]?.trim() || inferredStatusCategory(value.status ?? "", resolution),
      priority: value.prioridade?.trim() || null,
      resolution: resolution || null,
      assignee_name: value.responsavel?.trim() || null,
      assignee_account_id: value["id do responsavel"]?.trim() || null,
      source_created_at: createdAt,
      source_updated_at: updatedAt,
      source_resolved_at: resolvedAt,
      due_at: dueAt,
      parent_key: value["chave pai"]?.trim() || null,
    });
  }
  return { projectKey, rows, issues };
}

export type JiraFilters = {
  period?: "all" | "today" | "7" | "14" | "21" | "30";
  assignee?: string;
  priority?: string;
  issueType?: string;
  status?: string;
};

function isCompleted(issue: Pick<JiraIssue, "status_category">) {
  return normalized(issue.status_category).includes("conclu");
}

export function jiraAssigneeIdentity(issue: Pick<JiraIssue, "assignee_account_id" | "assignee_name">) {
  return issue.assignee_account_id || (issue.assignee_name?.trim() ? `name:${normalized(issue.assignee_name)}` : "__unassigned__");
}

export function buildJiraProjectDashboard(issues: JiraIssue[], referenceDate: string, filters: JiraFilters = {}) {
  const reference = new Date(`${referenceDate}T23:59:59-03:00`);
  const filtered = issues.filter((issue) => {
    if (filters.assignee && jiraAssigneeIdentity(issue) !== filters.assignee) return false;
    if (filters.priority && issue.priority !== filters.priority) return false;
    if (filters.issueType && issue.issue_type !== filters.issueType) return false;
    if (filters.status && issue.status !== filters.status) return false;
    if (filters.period && filters.period !== "all") {
      if (!issue.source_updated_at) return false;
      const updated = new Date(issue.source_updated_at);
      const days = filters.period === "today" ? 0 : Number(filters.period) - 1;
      const start = new Date(`${referenceDate}T00:00:00-03:00`);
      start.setUTCDate(start.getUTCDate() - days);
      if (updated < start || updated > reference) return false;
    }
    return true;
  });
  const completed = filtered.filter(isCompleted);
  const open = filtered.filter((issue) => !isCompleted(issue));
  const overdue = open.filter((issue) => issue.due_at && issue.due_at < referenceDate);
  const unassigned = open.filter((issue) => jiraAssigneeIdentity(issue) === "__unassigned__");
  const byAssignee = new Map<string, { id: string; name: string; total: number; open: number; completed: number }>();
  for (const issue of filtered) {
    const id = jiraAssigneeIdentity(issue);
    const entry = byAssignee.get(id) ?? { id, name: issue.assignee_name ?? "Sem responsável", total: 0, open: 0, completed: 0 };
    entry.total += 1;
    if (isCompleted(issue)) entry.completed += 1; else entry.open += 1;
    byAssignee.set(id, entry);
  }
  return {
    issues: filtered,
    kpis: { total: filtered.length, completed: completed.length, open: open.length, overdue: overdue.length, unassigned: unassigned.length },
    assignees: [...byAssignee.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR")),
  };
}
