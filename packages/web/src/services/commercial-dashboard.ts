import type { Client, CommercialAgendaEntry, CommercialAgendaEntryKind, CommercialCockpitStage, CommercialCockpitState, CommercialDailyProspecting, CommercialOpportunity, CommercialOpportunityStage, CommercialOpportunityStageEvent, UserProfile } from "@/lib/types/database";

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
  { key: "awaiting_signature", label: "Contrato aguardando assinatura", field: "awaiting_signature_count" },
  { key: "won", label: "Vendas fechadas", field: "won_count" },
] as const;

export const COMMERCIAL_COCKPIT_STAGE_LABEL: Record<CommercialCockpitStage, string> = {
  prospecting: "Prospecção",
  meetings: "Reuniões agendadas",
  nda_poc: "NDA / POC",
  awaiting_signature: "Contrato aguardando assinatura",
  won: "Vendas fechadas",
};

export const COMMERCIAL_COCKPIT_STAGES = Object.keys(COMMERCIAL_COCKPIT_STAGE_LABEL) as CommercialCockpitStage[];

export type CommercialDashboardUser = Pick<UserProfile, "id" | "name" | "role"> & {
  stages: CommercialCockpitStage[];
  scopeUpdatedAt?: string;
};

export type CommercialFunnelCompany = {
  id: string;
  companyName: string;
  enteredAt: string;
  daysInStage: number;
};

const OPPORTUNITY_TO_COCKPIT_STAGE: Partial<Record<CommercialOpportunityStage, CommercialCockpitStage>> = {
  prospecting: "prospecting",
  meeting: "meetings",
  qualification: "nda_poc",
  nda_poc: "nda_poc",
  proposal: "nda_poc",
  negotiation: "nda_poc",
  awaiting_signature: "awaiting_signature",
  won: "won",
};

export function buildCommercialFunnelCompanies({ opportunities, clients, events, referenceAt }: {
  opportunities: CommercialOpportunity[];
  clients: Array<Pick<Client, "id" | "name">>;
  events: CommercialOpportunityStageEvent[];
  referenceAt: string;
}) {
  const clientsById = new Map(clients.map((client) => [client.id, client.name]));
  const opportunitiesById = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity]));
  const latestEntryByOpportunity = new Map<string, CommercialOpportunityStageEvent>();
  for (const event of [...events].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const opportunity = opportunitiesById.get(event.opportunity_id);
    if (opportunity?.stage === event.to_stage && !latestEntryByOpportunity.has(event.opportunity_id)) {
      latestEntryByOpportunity.set(event.opportunity_id, event);
    }
  }

  const grouped = Object.fromEntries(
    COMMERCIAL_COCKPIT_STAGES.map((stage) => [stage, [] as CommercialFunnelCompany[]]),
  ) as Record<CommercialCockpitStage, CommercialFunnelCompany[]>;

  for (const opportunity of opportunities) {
    const cockpitStage = OPPORTUNITY_TO_COCKPIT_STAGE[opportunity.stage];
    if (!cockpitStage) continue;
    const enteredAt = latestEntryByOpportunity.get(opportunity.id)?.created_at ?? opportunity.created_at;
    grouped[cockpitStage].push({
      id: opportunity.id,
      companyName: clientsById.get(opportunity.client_id) ?? "Empresa não encontrada",
      enteredAt,
      daysInStage: commercialDaysSince(enteredAt, referenceAt),
    });
  }

  for (const stage of COMMERCIAL_COCKPIT_STAGES) {
    grouped[stage].sort((a, b) => b.daysInStage - a.daysInStage || a.companyName.localeCompare(b.companyName, "pt-BR"));
  }
  return grouped;
}

export function commercialAgendaStage(kind: CommercialAgendaEntryKind): CommercialCockpitStage | null {
  if (kind === "meeting") return "meetings";
  if (kind === "nda_poc" || kind === "proposal") return "nda_poc";
  if (kind === "won") return "won";
  return null;
}

export function commercialDateKey(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function commercialDaysSince(from: string, to: string) {
  const fromDate = new Date(`${commercialDateKey(from)}T12:00:00Z`);
  const toDate = new Date(`${commercialDateKey(to)}T12:00:00Z`);
  return Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000));
}

function latestPast(values: Array<string | null>, referenceAt: string) {
  const referenceDate = commercialDateKey(referenceAt);
  return values
    .filter((value): value is string => value !== null && commercialDateKey(value) <= referenceDate)
    .sort((a, b) => commercialDateKey(b).localeCompare(commercialDateKey(a)))[0] ?? null;
}

export function buildDailyProspectingChart({ entries, users, referenceAt, days = 14 }: {
  entries: CommercialDailyProspecting[];
  users: CommercialDashboardUser[];
  referenceAt: string;
  days?: number;
}) {
  const series = users
    .filter((user) => user.role === "analista" && user.stages.includes("prospecting"))
    .map((user) => ({ id: user.id, name: user.name ?? "Analista" }));
  const countByOwnerAndDate = new Map(entries.map((entry) => [
    `${entry.owner_user_id}:${entry.activity_on}`,
    entry.prospecting_count,
  ]));
  const end = new Date(`${commercialDateKey(referenceAt)}T12:00:00Z`);
  const chartDays = Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (days - index - 1));
    const dateValue = date.toISOString().slice(0, 10);
    return {
      date: dateValue,
      label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(date),
      counts: Object.fromEntries(series.map((item) => [item.id, countByOwnerAndDate.get(`${item.id}:${dateValue}`) ?? 0])),
    };
  });

  return { series, days: chartDays };
}

export function buildCommercialDashboard({ states, agendaEntries, dailyProspecting = [], opportunities = [], clients = [], opportunityEvents = [], users, referenceAt }: {
  states: CommercialCockpitState[];
  agendaEntries: CommercialAgendaEntry[];
  dailyProspecting?: CommercialDailyProspecting[];
  opportunities?: CommercialOpportunity[];
  clients?: Array<Pick<Client, "id" | "name">>;
  opportunityEvents?: CommercialOpportunityStageEvent[];
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

  const scopedAgendaEntries = agendaEntries.filter((entry) => {
    const requiredStage = commercialAgendaStage(entry.kind);
    return requiredStage === null || stagesByUser.get(entry.owner_user_id)?.has(requiredStage);
  });
  const scheduledMeetingCount = scopedAgendaEntries.filter(
    (entry) => entry.kind === "meeting" && entry.status === "scheduled",
  ).length;
  const companiesByStage = buildCommercialFunnelCompanies({ opportunities, clients, events: opportunityEvents, referenceAt });
  companiesByStage.meetings = scopedAgendaEntries
    .filter((entry) => entry.kind === "meeting" && entry.status === "scheduled")
    .map((entry) => ({
      id: entry.id,
      companyName: entry.company_name,
      enteredAt: entry.created_at,
      daysInStage: commercialDaysSince(entry.created_at, referenceAt),
    }))
    .sort((a, b) => b.daysInStage - a.daysInStage || a.companyName.localeCompare(b.companyName, "pt-BR"));
  const visibleFunnelStages = COMMERCIAL_COCKPIT_FUNNEL.filter((stage) => visibleStages.has(stage.key));
  const countForStage = (stage: (typeof COMMERCIAL_COCKPIT_FUNNEL)[number]) => stage.key === "meetings"
    ? scheduledMeetingCount
    : statesForStage(stage.key).reduce((total, state) => total + state[stage.field], 0);
  const funnel = visibleFunnelStages.map((stage, index, stages) => {
    const count = countForStage(stage);
    const previousStage = index > 0 ? stages[index - 1] : null;
    const previousCount = previousStage ? countForStage(previousStage) : null;
    return {
      key: stage.key,
      label: stage.label,
      count,
      conversion: previousCount && previousCount > 0 ? Math.round((count / previousCount) * 1_000) / 10 : null,
      companies: companiesByStage[stage.key],
      unlinkedCount: Math.max(0, count - companiesByStage[stage.key].length),
    };
  });

  const agenda = scopedAgendaEntries
    .filter((entry) => entry.status === "scheduled"
      && (entry.kind !== "meeting" || entry.scheduled_at > referenceAt))
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
    ...dailyProspecting.map((entry) => ({ at: entry.updated_at, by: entry.updated_by })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const latestUpdate = updatedItems[0] ?? null;

  return {
    kpis,
    funnel,
    agenda,
    overdue,
    prospectingChart: buildDailyProspectingChart({ entries: dailyProspecting, users, referenceAt }),
    updatedAt: latestUpdate?.at ?? null,
    updatedBy: users.find((user) => user.id === latestUpdate?.by)?.name ?? null,
  };
}
