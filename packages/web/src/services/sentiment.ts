import type { InteractionView } from "@/lib/types/database";

export type Sentiment = "positivo" | "neutro" | "negativo";

/**
 * Proxy de sentimento sem custo de API: compara a relevância média das
 * interações mais recentes de um stakeholder com a relevância média
 * anterior. Não é análise de linguagem natural — é uma aproximação
 * deliberada, decidida com o usuário como alternativa sem custo ao LLM.
 */
export function computeStakeholderSentiment(
  contactId: string,
  interactions: InteractionView[],
): Sentiment | null {
  const withContact = interactions
    .filter((i) => i.contact_id === contactId)
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

  if (withContact.length < 2) return null;

  const mid = Math.floor(withContact.length / 2);
  const earlier = withContact.slice(0, mid || 1);
  const recent = withContact.slice(mid || 1);
  const avg = (arr: InteractionView[]) => arr.reduce((s, i) => s + i.relevance, 0) / arr.length;

  const delta = avg(recent) - avg(earlier);
  if (delta >= 0.5) return "positivo";
  if (delta <= -0.5) return "negativo";
  return "neutro";
}

export const SENTIMENT_CONFIG: Record<Sentiment, { label: string; badge: string }> = {
  positivo: { label: "Sentimento positivo", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  neutro: { label: "Sentimento neutro", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  negativo: { label: "Sentimento em queda", badge: "bg-red-100 text-red-700 border-red-200" },
};
