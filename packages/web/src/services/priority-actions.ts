import type { ClientProductMatrixRow, InteractionView } from "@/lib/types/database";

export type PriorityAction = {
  key: string;
  clientId: string;
  clientName: string;
  productId: string;
  productName: string;
  priority: "alta" | "media";
  reason: string;
  managerName: string | null;
  dueAt: string;
  daysSinceContact: number;
  score: number;
};

type ActionRule = {
  kind: "critical" | "alert" | "stale";
  priority: PriorityAction["priority"];
  dueDays: number;
  reason: (row: ClientProductMatrixRow) => string;
};

function ruleFor(row: ClientProductMatrixRow): ActionRule | null {
  if (row.status === "critico") {
    return {
      kind: "critical",
      priority: "alta",
      dueDays: 1,
      reason: (item) => `Relacionamento crítico com score ${item.composite_score}.`,
    };
  }
  if (row.status === "alerta") {
    return {
      kind: "alert",
      priority: "alta",
      dueDays: 3,
      reason: (item) => `Relacionamento em alerta há ${item.days_since_contact} dias sem contato.`,
    };
  }
  if (row.status === "atencao") {
    return {
      kind: "stale",
      priority: "media",
      dueDays: 7,
      reason: (item) => `${item.days_since_contact} dias sem uma interação registrada.`,
    };
  }
  return null;
}

export function generatePriorityActions(
  matrix: ClientProductMatrixRow[],
  interactions: InteractionView[],
): PriorityAction[] {
  const managerByCombo = new Map<string, string>();
  for (const interaction of interactions) {
    const combo = `${interaction.client_id}::${interaction.product_id}`;
    if (!managerByCombo.has(combo) && interaction.manager_name) {
      managerByCombo.set(combo, interaction.manager_name);
    }
  }

  const now = new Date();
  return matrix
    .flatMap((row): PriorityAction[] => {
      const rule = ruleFor(row);
      if (!rule) return [];
      const dueAt = new Date(now);
      dueAt.setDate(dueAt.getDate() + rule.dueDays);
      const combo = `${row.client_id}::${row.product_id}`;
      return [{
        key: `v1:${row.client_id}:${row.product_id}:${rule.kind}`,
        clientId: row.client_id,
        clientName: row.client_name,
        productId: row.product_id,
        productName: row.product_name,
        priority: rule.priority,
        reason: rule.reason(row),
        managerName: managerByCombo.get(combo) ?? null,
        dueAt: dueAt.toISOString(),
        daysSinceContact: row.days_since_contact,
        score: row.composite_score,
      }];
    })
    .sort((a, b) => {
      const priorityDelta = (a.priority === "alta" ? 0 : 1) - (b.priority === "alta" ? 0 : 1);
      if (priorityDelta !== 0) return priorityDelta;
      const dueDelta = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      if (dueDelta !== 0) return dueDelta;
      return b.daysSinceContact - a.daysSinceContact;
    });
}
