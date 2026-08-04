import type { CommercialOpportunity, CommercialOpportunityStage, CommercialOpportunityStageEvent, InteractionView } from "@/lib/types/database";
import { buildCommercialFunnel } from "@/services/commercial-opportunities";

export type CommercialDashboardFilters = {
  periodDays: number | null;
  ownerManagerId?: string;
  stage?: CommercialOpportunityStage;
  clientId?: string;
  productId?: string;
};

type DashboardInput = {
  opportunities: CommercialOpportunity[];
  events: CommercialOpportunityStageEvent[];
  interactions: InteractionView[];
  filters: CommercialDashboardFilters;
  referenceAt: string;
};

function dateKey(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function daysBetween(from: string, to: string) {
  const fromDate = new Date(`${dateKey(from)}T12:00:00Z`);
  const toDate = new Date(`${dateKey(to)}T12:00:00Z`);
  return Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000));
}

function latest(values: string[]) {
  return values.sort((a, b) => b.localeCompare(a))[0] ?? null;
}

export function buildCommercialDashboard({ opportunities, events, interactions, filters, referenceAt }: DashboardInput) {
  const cutoff = filters.periodDays === null
    ? null
    : new Date(new Date(referenceAt).getTime() - filters.periodDays * 86_400_000).toISOString();
  const scopedOpportunities = opportunities.filter((opportunity) =>
    (!cutoff || opportunity.updated_at >= cutoff)
    && (!filters.ownerManagerId || opportunity.owner_manager_id === filters.ownerManagerId)
    && (!filters.stage || opportunity.stage === filters.stage)
    && (!filters.clientId || opportunity.client_id === filters.clientId)
    && (!filters.productId || opportunity.product_id === filters.productId),
  );
  const opportunityIds = new Set(scopedOpportunities.map((opportunity) => opportunity.id));
  const scopedEvents = events.filter((event) => opportunityIds.has(event.opportunity_id) && (!cutoff || event.created_at >= cutoff));
  const scopedInteractions = interactions.filter((interaction) =>
    interaction.business_area === "commercial"
    && (!cutoff || interaction.occurred_at >= cutoff.slice(0, 10))
    && (!filters.ownerManagerId || interaction.manager_id === filters.ownerManagerId)
    && (!filters.clientId || interaction.client_id === filters.clientId)
    && (!filters.productId || interaction.product_id === filters.productId),
  );

  const kpiDate = {
    meeting: latest(scopedInteractions.filter((interaction) => interaction.interaction_type === "meeting").map((interaction) => interaction.occurred_at)),
    nda_poc: latest(scopedEvents.filter((event) => event.to_stage === "nda_poc").map((event) => event.created_at)),
    proposal: latest(scopedEvents.filter((event) => event.to_stage === "proposal").map((event) => event.created_at)),
    won: latest(scopedEvents.filter((event) => event.to_stage === "won").map((event) => event.created_at)),
  };
  const kpis = [
    { key: "meeting", label: "Dias sem nova reunião", date: kpiDate.meeting },
    { key: "nda_poc", label: "Dias desde o último NDA / POC", date: kpiDate.nda_poc },
    { key: "proposal", label: "Dias desde a última proposta", date: kpiDate.proposal },
    { key: "won", label: "Dias desde a última venda ganha", date: kpiDate.won },
  ].map((item) => ({ ...item, days: item.date ? daysBetween(item.date, referenceAt) : null }));

  const agenda = scopedOpportunities
    .filter((opportunity) => !["won", "lost"].includes(opportunity.stage) && opportunity.next_step_at)
    .sort((a, b) => a.next_step_at!.localeCompare(b.next_step_at!));
  const overdue = agenda.filter((opportunity) => opportunity.next_step_at! < referenceAt);

  return {
    opportunities: scopedOpportunities,
    interactions: scopedInteractions,
    events: scopedEvents,
    funnel: buildCommercialFunnel(scopedOpportunities),
    kpis,
    agenda,
    overdue,
  };
}
