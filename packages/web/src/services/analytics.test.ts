import { describe, expect, it } from "vitest";
import type { ClientProductMatrixRow } from "@/lib/types/database";
import {
  averageDaysSinceContact,
  averageScoreComponents,
  groupHealthByProduct,
} from "@/services/analytics";

function row(overrides: Partial<ClientProductMatrixRow> = {}): ClientProductMatrixRow {
  return {
    client_id: "c1", client_name: "Cliente", product_id: "p1", product_name: "Produto", product_color: null,
    last_contact: "2026-07-28", interaction_count: 1, avg_relevance: 4, days_since_contact: 2, status: "recente",
    recency_score: 90, frequency_score: 80, relevance_score: 75, participation_score: 70, diversity_score: 60,
    composite_score: 80, ...overrides,
  };
}

describe("analytics normalization", () => {
  it("mantém score e componentes no intervalo de 0 a 100", () => {
    expect(groupHealthByProduct([row({ composite_score: 492 })])[0]?.score).toBe(100);
    expect(groupHealthByProduct([row({ composite_score: -10 })])[0]?.score).toBe(0);
    expect(averageScoreComponents([row({ recency_score: 300, diversity_score: -20 })])).toEqual(expect.arrayContaining([
      { component: "Recência", value: 100 },
      { component: "Diversidade", value: 0 },
    ]));
  });

  it("não apresenta tempo negativo para interação futura", () => {
    expect(averageDaysSinceContact([row({ days_since_contact: -60 })])).toBe(0);
  });
});
