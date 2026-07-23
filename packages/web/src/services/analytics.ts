import type { ClientProductMatrixRow, InteractionType, InteractionView } from "@/lib/types/database";

export type NamedScore = { name: string; score: number; count: number };

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function groupHealthByProduct(matrix: ClientProductMatrixRow[]): NamedScore[] {
  const byProduct = new Map<string, number[]>();
  for (const m of matrix) {
    const list = byProduct.get(m.product_name) ?? [];
    list.push(m.composite_score);
    byProduct.set(m.product_name, list);
  }
  return Array.from(byProduct.entries())
    .map(([name, scores]) => ({ name, score: average(scores), count: scores.length }))
    .sort((a, b) => a.score - b.score);
}

export function groupHealthByClient(matrix: ClientProductMatrixRow[]): NamedScore[] {
  const byClient = new Map<string, number[]>();
  for (const m of matrix) {
    const list = byClient.get(m.client_name) ?? [];
    list.push(m.composite_score);
    byClient.set(m.client_name, list);
  }
  return Array.from(byClient.entries())
    .map(([name, scores]) => ({ name, score: average(scores), count: scores.length }))
    .sort((a, b) => a.score - b.score);
}

/**
 * Health por executivo — atribui cada combinação cliente×produto ao gestor
 * mais frequente naquela combinação, depois calcula a média dos scores das
 * combinações atribuídas a cada gestor.
 */
export function groupHealthByManager(
  matrix: ClientProductMatrixRow[],
  interactions: InteractionView[],
): NamedScore[] {
  const managerByCombo = new Map<string, string>();
  const countsByCombo = new Map<string, Map<string, number>>();

  for (const i of interactions) {
    if (!i.manager_name) continue;
    const key = `${i.client_id}::${i.product_id}`;
    const counts = countsByCombo.get(key) ?? new Map<string, number>();
    counts.set(i.manager_name, (counts.get(i.manager_name) ?? 0) + 1);
    countsByCombo.set(key, counts);
  }
  for (const [key, counts] of countsByCombo.entries()) {
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) managerByCombo.set(key, top[0]);
  }

  const byManager = new Map<string, number[]>();
  for (const m of matrix) {
    const key = `${m.client_id}::${m.product_id}`;
    const manager = managerByCombo.get(key);
    if (!manager) continue;
    const list = byManager.get(manager) ?? [];
    list.push(m.composite_score);
    byManager.set(manager, list);
  }

  return Array.from(byManager.entries())
    .map(([name, scores]) => ({ name, score: average(scores), count: scores.length }))
    .sort((a, b) => a.score - b.score);
}

export type TypeCount = { type: InteractionType; count: number };

export function countInteractionsByType(interactions: InteractionView[]): TypeCount[] {
  const counts = new Map<InteractionType, number>();
  for (const i of interactions) {
    counts.set(i.interaction_type, (counts.get(i.interaction_type) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export function topTopics(interactions: InteractionView[], limit = 8): { topic: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const i of interactions) {
    counts.set(i.topic, (counts.get(i.topic) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function averageDaysSinceContact(matrix: ClientProductMatrixRow[]): number {
  if (matrix.length === 0) return 0;
  return Math.round(
    matrix.reduce((sum, m) => sum + m.days_since_contact, 0) / matrix.length,
  );
}

export type ScoreComponent = { component: string; value: number };

export function averageScoreComponents(matrix: ClientProductMatrixRow[]): ScoreComponent[] {
  if (matrix.length === 0) {
    return [
      { component: "Recência", value: 0 },
      { component: "Frequência", value: 0 },
      { component: "Relevância", value: 0 },
      { component: "Participação", value: 0 },
      { component: "Diversidade", value: 0 },
    ];
  }
  const sum = matrix.reduce(
    (acc, m) => ({
      recency: acc.recency + m.recency_score,
      frequency: acc.frequency + m.frequency_score,
      relevance: acc.relevance + m.relevance_score,
      participation: acc.participation + m.participation_score,
      diversity: acc.diversity + m.diversity_score,
    }),
    { recency: 0, frequency: 0, relevance: 0, participation: 0, diversity: 0 },
  );
  const n = matrix.length;
  return [
    { component: "Recência", value: Math.round(sum.recency / n) },
    { component: "Frequência", value: Math.round(sum.frequency / n) },
    { component: "Relevância", value: Math.round(sum.relevance / n) },
    { component: "Participação", value: Math.round(sum.participation / n) },
    { component: "Diversidade", value: Math.round(sum.diversity / n) },
  ];
}
