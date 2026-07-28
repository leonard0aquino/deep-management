import { parseLocalDate } from "@/lib/local-date";
import type {
  ClientPortfolioItemImpact,
  ClientPortfolioItemProbability,
  ClientPortfolioItemStatus,
  ClientRiskOpportunity,
} from "@/lib/types/database";

const IMPACT_SCORE: Record<ClientPortfolioItemImpact, number> = { baixo: 1, medio: 2, alto: 3 };
const PROBABILITY_SCORE: Record<ClientPortfolioItemProbability, number> = { baixa: 1, media: 2, alta: 3 };

export const PORTFOLIO_ITEM_STATUS: Record<ClientPortfolioItemStatus, { label: string; badge: string }> = {
  aberto: { label: "Aberto", badge: "border-amber-200 bg-amber-50 text-amber-700" },
  em_andamento: { label: "Em andamento", badge: "border-blue-200 bg-blue-50 text-blue-700" },
  concluido: { label: "Concluído", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  descartado: { label: "Descartado", badge: "border-zinc-200 bg-zinc-50 text-zinc-600" },
};

export const IMPACT_LABEL: Record<ClientPortfolioItemImpact, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
};

export const PROBABILITY_LABEL: Record<ClientPortfolioItemProbability, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export function isPortfolioItemClosed(item: Pick<ClientRiskOpportunity, "status">) {
  return item.status === "concluido" || item.status === "descartado";
}

export function getPriorityScore(
  item: Pick<ClientRiskOpportunity, "impact" | "probability">,
): number {
  return IMPACT_SCORE[item.impact] * PROBABILITY_SCORE[item.probability];
}

export function getPriorityLabel(score: number): "Baixa" | "Média" | "Alta" {
  if (score >= 7) return "Alta";
  if (score >= 4) return "Média";
  return "Baixa";
}

export function isPortfolioItemOverdue(
  item: Pick<ClientRiskOpportunity, "status" | "target_date">,
  now = new Date(),
) {
  if (isPortfolioItemClosed(item)) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return parseLocalDate(item.target_date) < today;
}

export function sortPortfolioItems(items: ClientRiskOpportunity[]) {
  return [...items].sort((a, b) => {
    const closedDifference = Number(isPortfolioItemClosed(a)) - Number(isPortfolioItemClosed(b));
    if (closedDifference !== 0) return closedDifference;
    const scoreDifference = getPriorityScore(b) - getPriorityScore(a);
    if (scoreDifference !== 0) return scoreDifference;
    const dateDifference = a.target_date.localeCompare(b.target_date);
    return dateDifference || a.title.localeCompare(b.title, "pt-BR");
  });
}

export function summarizePortfolioItems(items: ClientRiskOpportunity[], now = new Date()) {
  return {
    openRisks: items.filter((item) => item.kind === "risco" && !isPortfolioItemClosed(item)).length,
    openOpportunities: items.filter((item) => item.kind === "oportunidade" && !isPortfolioItemClosed(item)).length,
    overdue: items.filter((item) => isPortfolioItemOverdue(item, now)).length,
  };
}
