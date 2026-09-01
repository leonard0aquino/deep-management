import type { CommercialOpportunity, CommercialOpportunityStage } from "@/lib/types/database";

export const COMMERCIAL_STAGE_ORDER: CommercialOpportunityStage[] = [
  "prospecting", "meeting", "qualification", "nda_poc", "proposal", "negotiation", "awaiting_signature", "won", "lost",
];

export const COMMERCIAL_STAGE_LABEL: Record<CommercialOpportunityStage, string> = {
  prospecting: "Prospecção",
  meeting: "Reunião",
  qualification: "Qualificação",
  nda_poc: "NDA / POC",
  proposal: "Proposta",
  negotiation: "Negociação",
  awaiting_signature: "Chamado aguardando assinatura",
  won: "Ganha",
  lost: "Perdida",
};

export type CommercialOpportunityFilters = {
  stage?: CommercialOpportunityStage;
  ownerManagerId?: string;
  search?: string;
};

export function filterCommercialOpportunities(
  opportunities: CommercialOpportunity[],
  filters: CommercialOpportunityFilters,
) {
  const search = filters.search?.trim().toLocaleLowerCase("pt-BR");
  return opportunities.filter((opportunity) =>
    (!filters.stage || opportunity.stage === filters.stage)
    && (!filters.ownerManagerId || opportunity.owner_manager_id === filters.ownerManagerId)
    && (!search || opportunity.name.toLocaleLowerCase("pt-BR").includes(search)),
  );
}

export function buildCommercialFunnel(opportunities: CommercialOpportunity[]) {
  return COMMERCIAL_STAGE_ORDER.map((stage) => {
    const rows = opportunities.filter((opportunity) => opportunity.stage === stage);
    return {
      stage,
      label: COMMERCIAL_STAGE_LABEL[stage],
      count: rows.length,
      amount: rows.reduce((sum, opportunity) => sum + Number(opportunity.amount), 0),
      weightedAmount: rows.reduce(
        (sum, opportunity) => sum + Number(opportunity.amount) * (opportunity.probability / 100),
        0,
      ),
    };
  });
}
