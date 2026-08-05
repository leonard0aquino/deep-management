import type { CommercialAgendaEntry, CommercialAgendaEntryKind, CommercialCockpitStage, CommercialCockpitState, UserProfile } from "@/lib/types/database";

export const COMMERCIAL_COCKPIT_KIND_LABEL = {
  meeting: "Reunião",
  nda_poc: "NDA / POC",
  proposal: "Proposta",
  won: "Venda fechada",
  other: "Outro compromisso",
} as const;

export const COMMERCIAL_COCKPIT_FUNNEL = [
  { key: "prospecting", label: "Prospecção", field: "prospecting_count" },
  { key: "meetings", label: "Reuniões agendadas", field: "meetings_count" },
  { key: "nda_poc", label: "NDA / POC", field: "nda_poc_count" },
  { key: "won", label: "Vendas fechadas", field: "won_count" },
] as const;

export const COMMERCIAL_COCKPIT_STAGE_LABEL: Record<CommercialCockpitStage, string> = {
  prospecting: "Prospecção",
  meetings: "Reuniões agendadas",
  nda_poc: "NDA / POC",
  won: "Vendas fechadas",
};

export const COMMERCIAL_COCKPIT_STAGES = Object.keys(COMMERCIAL_COCKPIT_STAGE_LABEL) as CommercialCockpitStage[];

export type CommercialDashboardUser = Pick<UserProfile, "id" | "name"> & {
  stages: CommercialCockpitStage[];
  scopeUpdatedAt?: string;
};

export function commercialAgendaStage(kind: CommercialAgendaEntryKind): CommercialCockpitStage | null {
  if (kind === "meeting") return "meetings";
  if (kind === "nda_poc" || kind === "proposal") return "nda_poc";
  if (kind === "won") return "won";
  return null;
}

function dateKey(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function commercialDaysSince(from: string, to: string) {
  const fromDate = new Date(`${dateKey(from)}T12:00:00Z`);
  const toDate = new Date(`${dateKey(to)}T12:00:00Z`);
  return Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000));
}

function latestPast(values: Array<string | null>, referenceAt: string) {
  const referenceDate = dateKey(referenceAt);
  return values
    .filter((value): value is string => value !== null && dateKey(value) <= referenceDate)
    .sort((a, b) => dateKey(b).localeCompare(dateKey(a)))[0] ?? null;
}

export function buildCommercialDashboard({ states, agendaEntries, users, referenceAt }: {
  states: CommercialCockpitState[];
  agendaEntries: CommercialAgendaEntry[];
  users: CommercialDashboardUser[];
  referenceAt: string;
}) {
  const stagesByUser = new Map(users.map((user) => [user.id, new Set(user.stages)]));
  const visibleStages = new Set(users.flatMap((user) => user.stages));
  const statesForStage = (stage: CommercialCockpitStage) => states.filter(
    (state) => stagesByUser.get(state.owner_user_id)?.has(stage),
  );
  const kpiDates = {
    meeting: latestPast(statesForStage("meetings").map((state) => state.last_meeting_on), referenceAt),
    nda_poc: latestPast(statesForStage("nda_poc").map((state) => state.last_nda_poc_on), referenceAt),
    proposal: latestPast(statesForStage("nda_poc").map((state) => state.last_proposal_on), referenceAt),
    won: latestPast(statesForStage("won").map((state) => state.last_won_on), referenceAt),
  };
  const kpis = [
    { key: "meeting", stage: "meetings", label: "Dias sem nova reunião", date: kpiDates.meeting },
    { key: "nda_poc", stage: "nda_poc", label: "Dias desde o último NDA / POC", date: kpiDates.nda_poc },
    { key: "proposal", stage: "nda_poc", label: "Dias desde a última proposta", date: kpiDates.proposal },
    { key: "won", stage: "won", label: "Dias desde a última venda fechada", date: kpiDates.won },
  ].filter((item) => visibleStages.has(item.stage as CommercialCockpitStage))
    .map((item) => ({ ...item, days: item.date ? commercialDaysSince(item.date, referenceAt) : null }));

  const visibleFunnelStages = COMMERCIAL_COCKPIT_FUNNEL.filter((stage) => visibleStages.has(stage.key));
  const funnel = visibleFunnelStages.map((stage, index, stages) => {
    const count = statesForStage(stage.key).reduce((total, state) => total + state[stage.field], 0);
    const previousStage = index > 0 ? stages[index - 1] : null;
    const previousCount = previousStage
      ? statesForStage(previousStage.key).reduce((total, state) => total + state[previousStage.field], 0)
      : null;
    return {
      key: stage.key,
      label: stage.label,
      count,
      conversion: previousCount && previousCount > 0 ? Math.round((count / previousCount) * 1_000) / 10 : null,
    };
  });

  const scopedAgendaEntries = agendaEntries.filter((entry) => {
      const requiredStage = commercialAgendaStage(entry.kind);
      return requiredStage === null || stagesByUser.get(entry.owner_user_id)?.has(requiredStage);
    });
  const agenda = scopedAgendaEntries
    .filter((entry) => entry.status === "scheduled")
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const overdue = agenda.filter((entry) => entry.scheduled_at < referenceAt);
  const updatedItems = [
    ...states.filter((state) => {
      const owner = users.find((user) => user.id === state.owner_user_id);
      return (owner?.stages.length ?? 0) > 0
        && (!owner?.scopeUpdatedAt || state.updated_at >= owner.scopeUpdatedAt);
    })
      .map((state) => ({ at: state.updated_at, by: state.updated_by })),
    ...scopedAgendaEntries.map((entry) => ({ at: entry.updated_at, by: entry.updated_by })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const latestUpdate = updatedItems[0] ?? null;

  return {
    kpis,
    funnel,
    agenda,
    overdue,
    updatedAt: latestUpdate?.at ?? null,
    updatedBy: users.find((user) => user.id === latestUpdate?.by)?.name ?? null,
  };
}
