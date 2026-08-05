import type { CommercialAgendaEntry, CommercialCockpitState, UserProfile } from "@/lib/types/database";

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

type CommercialUser = Pick<UserProfile, "id" | "name">;

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
  users: CommercialUser[];
  referenceAt: string;
}) {
  const kpiDates = {
    meeting: latestPast(states.map((state) => state.last_meeting_on), referenceAt),
    nda_poc: latestPast(states.map((state) => state.last_nda_poc_on), referenceAt),
    proposal: latestPast(states.map((state) => state.last_proposal_on), referenceAt),
    won: latestPast(states.map((state) => state.last_won_on), referenceAt),
  };
  const kpis = [
    { key: "meeting", label: "Dias sem nova reunião", date: kpiDates.meeting },
    { key: "nda_poc", label: "Dias desde o último NDA / POC", date: kpiDates.nda_poc },
    { key: "proposal", label: "Dias desde a última proposta", date: kpiDates.proposal },
    { key: "won", label: "Dias desde a última venda fechada", date: kpiDates.won },
  ].map((item) => ({ ...item, days: item.date ? commercialDaysSince(item.date, referenceAt) : null }));

  const funnel = COMMERCIAL_COCKPIT_FUNNEL.map((stage, index, stages) => {
    const count = states.reduce((total, state) => total + state[stage.field], 0);
    const previousStage = index > 0 ? stages[index - 1] : null;
    const previousCount = previousStage
      ? states.reduce((total, state) => total + state[previousStage.field], 0)
      : null;
    return {
      key: stage.key,
      label: stage.label,
      count,
      conversion: previousCount && previousCount > 0 ? Math.round((count / previousCount) * 1_000) / 10 : null,
    };
  });

  const agenda = agendaEntries
    .filter((entry) => entry.status === "scheduled")
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const overdue = agenda.filter((entry) => entry.scheduled_at < referenceAt);
  const updatedItems = [
    ...states.map((state) => ({ at: state.updated_at, by: state.updated_by })),
    ...agendaEntries.map((entry) => ({ at: entry.updated_at, by: entry.updated_by })),
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
