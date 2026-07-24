import type { AuditLogEntry } from "@/lib/types/database";

const TABLE_LABELS: Record<string, string> = {
  clients: "cliente",
  interactions: "interação",
  products: "produto",
  deep_managers: "gestor",
  client_contacts: "contato",
  notifications: "notificação",
  notification_preferences: "preferência de notificação",
  action_decisions: "decisão de ação",
  saved_dashboard_views: "view salva",
};

export const AUDIT_TABLE_OPTIONS = Object.entries(TABLE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const AUDIT_ACTION_OPTIONS = ["INSERT", "UPDATE", "DELETE"] as const;

const ACTION_VERBS: Record<string, string> = {
  INSERT: "criou",
  UPDATE: "atualizou",
  DELETE: "removeu",
};

const RECORD_LABEL_KEYS = ["name", "title", "topic"];

function recordLabel(diff: unknown, action: string): string | null {
  if (!diff || typeof diff !== "object") return null;
  const row =
    action === "UPDATE"
      ? (diff as { after?: Record<string, unknown> }).after
      : (diff as Record<string, unknown>);
  if (!row || typeof row !== "object") return null;
  for (const key of RECORD_LABEL_KEYS) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export function describeAuditEntry(entry: AuditLogEntry): string {
  const actor = entry.actor_name ?? entry.actor_email ?? "Alguém";
  const tableLabel = TABLE_LABELS[entry.table_name] ?? entry.table_name;
  const verb = ACTION_VERBS[entry.action] ?? entry.action.toLowerCase();
  const label = recordLabel(entry.diff, entry.action);
  return label ? `${actor} ${verb} ${tableLabel} "${label}"` : `${actor} ${verb} ${tableLabel}`;
}

export function changedFields(entry: AuditLogEntry): string[] {
  if (entry.action !== "UPDATE" || !entry.diff || typeof entry.diff !== "object") return [];
  const { before, after } = entry.diff as {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  if (!before || !after) return [];
  return Object.keys(after).filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
}

const CSV_COLUMNS = [
  "created_at",
  "action",
  "table_name",
  "record_id",
  "actor_name",
  "actor_email",
  "description",
  "changed_fields",
] as const;

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function auditEntriesToCsv(entries: AuditLogEntry[]): string {
  const rows = entries.map((entry) =>
    [
      entry.created_at,
      entry.action,
      entry.table_name,
      entry.record_id ?? "",
      entry.actor_name ?? "",
      entry.actor_email ?? "",
      describeAuditEntry(entry),
      changedFields(entry).join("; "),
    ]
      .map(csvCell)
      .join(","),
  );
  return [CSV_COLUMNS.join(","), ...rows].join("\n");
}
