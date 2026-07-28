import type { Client, ClientCommercialPlan } from "@/lib/types/database";
import { addCivilDays, civilDaysBetween } from "@/services/my-day";

const OPEN_STATUSES = new Set<ClientCommercialPlan["status"]>([
  "nao_iniciado",
  "em_preparacao",
  "em_negociacao",
]);

export const COMMERCIAL_PLAN_STATUS: Record<ClientCommercialPlan["status"], string> = {
  nao_iniciado: "Não iniciado",
  em_preparacao: "Em preparação",
  em_negociacao: "Em negociação",
  renovado: "Renovado",
  perdido: "Perdido",
};

export function weightedCommercialValues(plan: Pick<ClientCommercialPlan, "expected_renewal_value" | "expansion_value" | "probability">) {
  const factor = Math.min(100, Math.max(0, Number(plan.probability))) / 100;
  const renewal = Number(plan.expected_renewal_value) * factor;
  const expansion = Number(plan.expansion_value) * factor;
  return { renewal, expansion, total: renewal + expansion };
}

export type RenewalPortfolioSummary = {
  activeContractValue: number;
  renewalValue90Days: number;
  renewalValue180Days: number;
  weightedRenewalPipeline: number;
  weightedExpansionPipeline: number;
  upcoming: Array<{
    client: Client;
    plan: ClientCommercialPlan | null;
    daysRemaining: number;
  }>;
};

export function buildRenewalPortfolioSummary(
  clients: Client[],
  plans: ClientCommercialPlan[],
  today: string,
): RenewalPortfolioSummary {
  const activeClients = clients.filter((client) => client.active);
  const activeById = new Map(activeClients.map((client) => [client.id, client]));
  const planByClient = new Map(plans.map((plan) => [plan.client_id, plan]));
  const day90 = addCivilDays(today, 90);
  const day180 = addCivilDays(today, 180);
  const within = (client: Client, end: string) => {
    const date = client.contract_renewal_date;
    return date !== null && date >= today && date <= end;
  };

  let weightedRenewalPipeline = 0;
  let weightedExpansionPipeline = 0;
  for (const plan of plans) {
    if (!activeById.has(plan.client_id) || !OPEN_STATUSES.has(plan.status)) continue;
    const weighted = weightedCommercialValues(plan);
    weightedRenewalPipeline += weighted.renewal;
    weightedExpansionPipeline += weighted.expansion;
  }

  return {
    activeContractValue: activeClients.reduce((sum, client) => sum + Number(client.contract_value ?? 0), 0),
    renewalValue90Days: activeClients
      .filter((client) => within(client, day90))
      .reduce((sum, client) => sum + Number(client.contract_value ?? 0), 0),
    renewalValue180Days: activeClients
      .filter((client) => within(client, day180))
      .reduce((sum, client) => sum + Number(client.contract_value ?? 0), 0),
    weightedRenewalPipeline,
    weightedExpansionPipeline,
    upcoming: activeClients
      .filter((client) => within(client, day180))
      .map((client) => ({
        client,
        plan: planByClient.get(client.id) ?? null,
        daysRemaining: civilDaysBetween(today, client.contract_renewal_date!),
      }))
      .sort((left, right) => left.daysRemaining - right.daysRemaining),
  };
}

export function formatBRL(value: number): string {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
