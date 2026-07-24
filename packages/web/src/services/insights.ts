import type {
  Client,
  ClientHealth,
  ClientProductMatrixRow,
  HealthScoreSettings,
  InteractionView,
  Product,
} from "@/lib/types/database";

export type BriefingTone = "positive" | "warning" | "critical" | "opportunity";

export type BriefingItem = {
  text: string;
  tone: BriefingTone;
  /**
   * Identidade estável do evento de origem, usada para deduplicar
   * notificações. Eventos únicos (uma interação específica) usam o id da
   * interação e nunca mais se repetem; riscos contínuos (sem contato,
   * queda de frequência) incluem a data e assim notificam no máximo uma
   * vez por dia enquanto a condição persistir.
   */
  key: string;
};

const DAY_MS = 86_400_000;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / DAY_MS);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Gera o Executive Briefing em linguagem natural — motor de regras
 * determinístico sobre os dados reais (sem chamada a LLM). Cada regra
 * corresponde a um dos exemplos pedidos na spec do produto.
 */
export function generateExecutiveBriefing(input: {
  interactions: InteractionView[];
  matrix: ClientProductMatrixRow[];
  clientHealth: ClientHealth[];
  clients: Client[];
  products: Product[];
  scoreSettings: Pick<HealthScoreSettings, "threshold_ok_dias" | "threshold_alerta_dias">;
}): BriefingItem[] {
  const { interactions, matrix, clientHealth, clients, products, scoreSettings } = input;
  const items: BriefingItem[] = [];
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // 1. Clientes que receberam acompanhamento nas últimas 24h
  const recentByClient = new Map<string, InteractionView>();
  for (const i of interactions) {
    const occurred = new Date(i.occurred_at);
    const daysAgo = daysBetween(startOfToday, occurred);
    if (daysAgo >= 0 && daysAgo <= 1) {
      const existing = recentByClient.get(i.client_id);
      if (!existing || new Date(existing.occurred_at) < occurred) {
        recentByClient.set(i.client_id, i);
      }
    }
  }
  for (const i of Array.from(recentByClient.values()).slice(0, 3)) {
    items.push({ text: `${i.client_name} recebeu acompanhamento (${i.topic}).`, tone: "positive", key: `followup:${i.id}` });
  }

  // 2. Implantações concluídas recentemente (14 dias)
  const implantacoes = interactions
    .filter((i) => i.interaction_type === "implantacao")
    .filter((i) => {
      const days = daysBetween(startOfToday, new Date(i.occurred_at));
      return days >= 0 && days <= 14;
    })
    .slice(0, 2);
  for (const i of implantacoes) {
    items.push({ text: `${i.product_name} concluiu implantação em ${i.client_name}.`, tone: "positive", key: `implantacao:${i.id}` });
  }

  // 3. Clientes sem contato além do limite "OK" (ver Health Score > Status de relacionamento)
  const stale = [...clientHealth]
    .filter((c) => c.days_since_last_contact > scoreSettings.threshold_ok_dias)
    .sort((a, b) => b.days_since_last_contact - a.days_since_last_contact)
    .slice(0, 3);
  for (const c of stale) {
    items.push({
      text: `${c.client_name} está há ${c.days_since_last_contact} dias sem contato.`,
      tone: c.days_since_last_contact > scoreSettings.threshold_alerta_dias ? "critical" : "warning",
      key: `stale:${c.client_id}:${isoDate(startOfToday)}`,
    });
  }

  // 4. Produtos perdendo frequência de interação (30d vs 30d anteriores)
  for (const drop of detectFrequencyDrops(interactions, products).slice(0, 2)) {
    items.push({ text: `${drop.productName} perdeu frequência de interação.`, tone: "warning", key: `freqdrop:${drop.productId}:${isoDate(startOfToday)}` });
  }

  // 5. Oportunidades de cross-sell
  for (const opp of detectCrossSellOpportunities(matrix, clients, products).slice(0, 2)) {
    items.push({
      text: `Existe oportunidade de apresentar ${opp.productName} para ${opp.clientName}.`,
      tone: "opportunity",
      key: `crosssell:${opp.clientId}:${opp.productId}`,
    });
  }

  if (items.length === 0) {
    items.push({
      text: "Tudo tranquilo por aqui — nenhum sinal relevante nas últimas 24 horas.",
      tone: "positive",
      key: "all-quiet",
    });
  }

  return items;
}

export type FrequencyDrop = {
  productId: string;
  productName: string;
  recent: number;
  previous: number;
};

export function detectFrequencyDrops(
  interactions: InteractionView[],
  products: Product[],
): FrequencyDrop[] {
  const today = new Date();
  const cutoff30 = new Date(today.getTime() - 30 * DAY_MS);
  const cutoff60 = new Date(today.getTime() - 60 * DAY_MS);

  const countsRecent = new Map<string, number>();
  const countsPrevious = new Map<string, number>();

  for (const i of interactions) {
    const occurred = new Date(i.occurred_at);
    if (occurred >= cutoff30) {
      countsRecent.set(i.product_id, (countsRecent.get(i.product_id) ?? 0) + 1);
    } else if (occurred >= cutoff60 && occurred < cutoff30) {
      countsPrevious.set(i.product_id, (countsPrevious.get(i.product_id) ?? 0) + 1);
    }
  }

  const drops: FrequencyDrop[] = [];
  for (const p of products) {
    const previous = countsPrevious.get(p.id) ?? 0;
    const recent = countsRecent.get(p.id) ?? 0;
    if (previous >= 2 && recent < previous * 0.6) {
      drops.push({ productId: p.id, productName: p.name, recent, previous });
    }
  }
  return drops.sort((a, b) => b.previous - b.recent - (a.previous - a.recent));
}

export type CrossSellOpportunity = {
  clientId: string;
  clientName: string;
  productId: string;
  productName: string;
};

/**
 * Heurística simples: sugere, para cada cliente, o produto mais adotado
 * pela carteira que ele ainda não tem. Só sugere se pelo menos 2 outros
 * clientes já usam esse produto (sinal de adequação, não invenção).
 */
export function detectCrossSellOpportunities(
  matrix: ClientProductMatrixRow[],
  clients: Client[],
  products: Product[],
): CrossSellOpportunity[] {
  const activeCombos = new Set(matrix.map((m) => `${m.client_id}::${m.product_id}`));
  const productAdoptionCount = new Map<string, number>();
  for (const m of matrix) {
    productAdoptionCount.set(m.product_id, (productAdoptionCount.get(m.product_id) ?? 0) + 1);
  }

  const opportunities: CrossSellOpportunity[] = [];
  for (const client of clients) {
    const missing = products
      .filter((p) => !activeCombos.has(`${client.id}::${p.id}`))
      .sort((a, b) => (productAdoptionCount.get(b.id) ?? 0) - (productAdoptionCount.get(a.id) ?? 0));
    const best = missing[0];
    if (best && (productAdoptionCount.get(best.id) ?? 0) >= 2) {
      opportunities.push({
        clientId: client.id,
        clientName: client.name,
        productId: best.id,
        productName: best.name,
      });
    }
  }
  return opportunities;
}

export function detectAtRiskClients(clientHealth: ClientHealth[]): ClientHealth[] {
  return [...clientHealth]
    .filter((c) => c.score < 55 || c.critical_products > 0)
    .sort((a, b) => a.score - b.score);
}

export type UpsellOpportunity = {
  clientId: string;
  clientName: string;
  productId: string;
  productName: string;
  score: number;
};

/**
 * Upsell é diferente de cross-sell: não é um produto faltante, é um
 * relacionamento JÁ existente e muito saudável (score >= 85) — bom
 * momento para propor expansão de escopo/contrato nesse produto.
 */
export function detectUpsellOpportunities(matrix: ClientProductMatrixRow[]): UpsellOpportunity[] {
  return matrix
    .filter((m) => m.composite_score >= 85)
    .map((m) => ({
      clientId: m.client_id,
      clientName: m.client_name,
      productId: m.product_id,
      productName: m.product_name,
      score: m.composite_score,
    }))
    .sort((a, b) => b.score - a.score);
}

export type BehaviorChange = {
  clientId: string;
  clientName: string;
  productId: string;
  productName: string;
  recentAvgRelevance: number;
  previousAvgRelevance: number;
};

/**
 * Mudança de comportamento: a frequência pode estar normal, mas a
 * qualidade/relevância das interações mais recentes caiu em relação às
 * anteriores — sinal de engajamento superficial (ex: só e-mails de rotina
 * onde antes havia reuniões substantivas).
 */
export function detectBehaviorChanges(interactions: InteractionView[]): BehaviorChange[] {
  const byCombo = new Map<string, InteractionView[]>();
  for (const i of interactions) {
    const key = `${i.client_id}::${i.product_id}`;
    const list = byCombo.get(key) ?? [];
    list.push(i);
    byCombo.set(key, list);
  }

  const changes: BehaviorChange[] = [];
  for (const list of byCombo.values()) {
    if (list.length < 4) continue;
    const sorted = [...list].sort(
      (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
    );
    const mid = Math.floor(sorted.length / 2);
    const earlier = sorted.slice(0, mid);
    const recent = sorted.slice(mid);
    const avg = (arr: InteractionView[]) => arr.reduce((s, i) => s + i.relevance, 0) / arr.length;
    const earlierAvg = avg(earlier);
    const recentAvg = avg(recent);

    if (recentAvg <= earlierAvg - 1) {
      const last = sorted[sorted.length - 1];
      changes.push({
        clientId: last.client_id,
        clientName: last.client_name,
        productId: last.product_id,
        productName: last.product_name,
        recentAvgRelevance: Math.round(recentAvg * 10) / 10,
        previousAvgRelevance: Math.round(earlierAvg * 10) / 10,
      });
    }
  }
  return changes.sort(
    (a, b) => a.recentAvgRelevance - a.previousAvgRelevance - (b.recentAvgRelevance - b.previousAvgRelevance),
  );
}

/**
 * Resumo narrativo de um período (semanal ou mensal) — mesma filosofia do
 * Executive Briefing, mas contando o que aconteceu numa janela fixa em vez
 * de olhar só para o estado atual.
 */
export function generatePeriodSummary(
  interactions: InteractionView[],
  days: number,
): BriefingItem[] {
  const cutoff = new Date(Date.now() - days * DAY_MS);
  const periodInteractions = interactions.filter((i) => new Date(i.occurred_at) >= cutoff);

  const items: BriefingItem[] = [];
  const clientsSeen = new Set(periodInteractions.map((i) => i.client_id));

  items.push({
    text: `${periodInteractions.length} interaç${periodInteractions.length === 1 ? "ão" : "ões"} registrada${
      periodInteractions.length === 1 ? "" : "s"
    } com ${clientsSeen.size} cliente${clientsSeen.size === 1 ? "" : "s"}.`,
    tone: "positive",
    key: `period-count:${days}`,
  });

  const topics = new Map<string, number>();
  for (const i of periodInteractions) {
    topics.set(i.topic, (topics.get(i.topic) ?? 0) + 1);
  }
  const topTopic = [...topics.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topTopic) {
    items.push({ text: `Tema mais recorrente do período: ${topTopic[0]}.`, tone: "positive", key: `period-top-topic:${days}` });
  }

  const critical = periodInteractions.filter((i) => i.status === "critico");
  if (critical.length > 0) {
    items.push({
      text: `${critical.length} interaç${critical.length === 1 ? "ão" : "ões"} registrada${
        critical.length === 1 ? "" : "s"
      } em relacionamentos já críticos.`,
      tone: "critical",
      key: `period-critical:${days}`,
    });
  }

  if (periodInteractions.length === 0) {
    items.push({ text: "Nenhuma interação registrada neste período.", tone: "warning", key: `period-empty:${days}` });
  }

  return items;
}

export type Recommendation = {
  text: string;
  priority: "alta" | "media" | "baixa";
};

/**
 * Consolida os sinais de risco, cross-sell e upsell em uma lista curta e
 * priorizada de próximas ações — o "o que fazer hoje" da IA.
 */
export function generateRecommendations(input: {
  atRisk: ClientHealth[];
  crossSell: CrossSellOpportunity[];
  upsell: UpsellOpportunity[];
  behaviorChanges: BehaviorChange[];
}): Recommendation[] {
  const { atRisk, crossSell, upsell, behaviorChanges } = input;
  const recommendations: Recommendation[] = [];

  for (const c of atRisk.slice(0, 3)) {
    recommendations.push({
      text: `Agendar contato urgente com ${c.client_name} — score em ${c.score}.`,
      priority: "alta",
    });
  }
  for (const b of behaviorChanges.slice(0, 2)) {
    recommendations.push({
      text: `Investigar queda de engajamento em ${b.clientName} · ${b.productName}.`,
      priority: "media",
    });
  }
  for (const opp of crossSell.slice(0, 2)) {
    recommendations.push({
      text: `Apresentar ${opp.productName} para ${opp.clientName}.`,
      priority: "media",
    });
  }
  for (const up of upsell.slice(0, 2)) {
    recommendations.push({
      text: `Explorar expansão de ${up.productName} com ${up.clientName} — relacionamento muito saudável.`,
      priority: "baixa",
    });
  }

  return recommendations;
}
