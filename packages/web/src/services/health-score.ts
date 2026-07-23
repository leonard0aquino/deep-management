import type { ClientContact, HealthScoreSettings, InteractionView } from "@/lib/types/database";

/**
 * Recomputa o score composto (mesma fórmula da view client_product_matrix)
 * retroativamente a partir do log bruto de interações, para gerar uma
 * tendência histórica sem precisar de snapshots agendados.
 */

type ComboAgg = {
  clientId: string;
  lastContact: number;
  count90d: number;
  relevanceSum: number;
  total: number;
  withContact: number;
  distinctContacts: Set<string>;
};

const DAY_MS = 86_400_000;

function buildCombos(interactions: InteractionView[], asOf: Date): Map<string, ComboAgg> {
  const asOfTime = asOf.getTime();
  const cutoff90 = asOfTime - 90 * DAY_MS;
  const map = new Map<string, ComboAgg>();

  for (const i of interactions) {
    const occurredTime = new Date(i.occurred_at).getTime();
    if (occurredTime > asOfTime) continue;

    const key = `${i.client_id}::${i.product_id}`;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        clientId: i.client_id,
        lastContact: occurredTime,
        count90d: 0,
        relevanceSum: 0,
        total: 0,
        withContact: 0,
        distinctContacts: new Set(),
      };
      map.set(key, entry);
    }

    if (occurredTime > entry.lastContact) entry.lastContact = occurredTime;
    if (occurredTime >= cutoff90) entry.count90d += 1;
    entry.relevanceSum += i.relevance;
    entry.total += 1;
    if (i.contact_id) {
      entry.withContact += 1;
      entry.distinctContacts.add(i.contact_id);
    }
  }

  return map;
}

type ScoreWeights = Pick<
  HealthScoreSettings,
  "weight_recency" | "weight_frequency" | "weight_relevance" | "weight_participation" | "weight_diversity"
>;

const DEFAULT_WEIGHTS: ScoreWeights = {
  weight_recency: 0.35,
  weight_frequency: 0.25,
  weight_relevance: 0.2,
  weight_participation: 0.1,
  weight_diversity: 0.1,
};

function scoreForCombo(entry: ComboAgg, asOf: Date, totalContactsForClient: number, weights: ScoreWeights): number {
  const daysSince = Math.floor((asOf.getTime() - entry.lastContact) / DAY_MS);
  const recency = Math.max(0, 100 - daysSince * (100 / 90));
  const frequency = Math.min(100, (entry.count90d / 4) * 100);
  const avgRelevance = entry.relevanceSum / entry.total;
  const relevance = ((avgRelevance - 1) / 4) * 100;
  const participation = entry.total > 0 ? (entry.withContact / entry.total) * 100 : 0;
  const diversity =
    totalContactsForClient > 0
      ? Math.min(100, (entry.distinctContacts.size / totalContactsForClient) * 100)
      : 0;

  return recency * Number(weights.weight_recency)
    + frequency * Number(weights.weight_frequency)
    + relevance * Number(weights.weight_relevance)
    + participation * Number(weights.weight_participation)
    + diversity * Number(weights.weight_diversity);
}

export type ScoreTrendPoint = { label: string; score: number };

export function computeScoreTrend(
  interactions: InteractionView[],
  contacts: ClientContact[],
  weeks = 8,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): ScoreTrendPoint[] {
  const contactsPerClient = new Map<string, number>();
  for (const c of contacts) {
    contactsPerClient.set(c.client_id, (contactsPerClient.get(c.client_id) ?? 0) + 1);
  }

  const points: ScoreTrendPoint[] = [];
  const today = new Date();

  for (let w = weeks - 1; w >= 0; w--) {
    const asOf = new Date(today);
    asOf.setDate(asOf.getDate() - w * 7);

    const combos = buildCombos(interactions, asOf);
    const label = asOf.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

    if (combos.size === 0) {
      points.push({ label, score: 0 });
      continue;
    }

    let sum = 0;
    for (const entry of combos.values()) {
      const totalContacts = contactsPerClient.get(entry.clientId) ?? 0;
      sum += scoreForCombo(entry, asOf, totalContacts, weights);
    }
    points.push({ label, score: Math.round(sum / combos.size) });
  }

  return points;
}
