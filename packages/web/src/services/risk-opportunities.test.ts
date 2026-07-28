import { describe, expect, it } from "vitest";
import type { ClientRiskOpportunity } from "@/lib/types/database";
import {
  getPriorityLabel,
  getPriorityScore,
  isPortfolioItemOverdue,
  sortPortfolioItems,
  summarizePortfolioItems,
} from "@/services/risk-opportunities";

function item(overrides: Partial<ClientRiskOpportunity> = {}): ClientRiskOpportunity {
  return {
    id: "i1",
    client_id: "c1",
    kind: "risco",
    title: "Risco operacional",
    description: null,
    impact: "medio",
    probability: "media",
    owner_manager_id: "m1",
    target_date: "2026-08-10",
    status: "aberto",
    created_by: "u1",
    updated_by: "u1",
    created_at: "2026-07-27",
    updated_at: "2026-07-27",
    ...overrides,
  };
}

describe("risk-opportunities", () => {
  it("calcula e nomeia a prioridade por impacto vezes probabilidade", () => {
    expect(getPriorityScore(item({ impact: "alto", probability: "alta" }))).toBe(9);
    expect(getPriorityLabel(9)).toBe("Alta");
    expect(getPriorityLabel(6)).toBe("Média");
    expect(getPriorityLabel(2)).toBe("Baixa");
  });

  it("ordena ativos por prioridade e data, deixando encerrados por último", () => {
    const sorted = sortPortfolioItems([
      item({ id: "closed", title: "Encerrado", impact: "alto", probability: "alta", status: "concluido" }),
      item({ id: "later", title: "Depois", impact: "alto", probability: "media", target_date: "2026-09-01" }),
      item({ id: "lower", title: "Menor", impact: "baixo", probability: "baixa" }),
      item({ id: "earlier", title: "Antes", impact: "alto", probability: "media", target_date: "2026-08-01" }),
    ]);
    expect(sorted.map(({ id }) => id)).toEqual(["earlier", "later", "lower", "closed"]);
  });

  it("considera vencimento pela data civil e ignora itens encerrados", () => {
    const now = new Date(2026, 6, 27, 8);
    expect(isPortfolioItemOverdue(item({ target_date: "2026-07-26" }), now)).toBe(true);
    expect(isPortfolioItemOverdue(item({ target_date: "2026-07-27" }), now)).toBe(false);
    expect(isPortfolioItemOverdue(item({ target_date: "2026-07-20", status: "descartado" }), now)).toBe(false);
  });

  it("resume riscos, oportunidades e vencidos ainda ativos", () => {
    const summary = summarizePortfolioItems([
      item({ id: "r1", kind: "risco", target_date: "2026-07-20" }),
      item({ id: "o1", kind: "oportunidade", target_date: "2026-08-20" }),
      item({ id: "o2", kind: "oportunidade", status: "concluido", target_date: "2026-07-20" }),
    ], new Date(2026, 6, 27, 8));
    expect(summary).toEqual({ openRisks: 1, openOpportunities: 1, overdue: 1 });
  });
});
