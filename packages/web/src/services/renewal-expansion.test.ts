import { describe, expect, it } from "vitest";
import type { Client, ClientCommercialPlan } from "@/lib/types/database";
import { buildRenewalPortfolioSummary, weightedCommercialValues } from "@/services/renewal-expansion";

const client = (id: string, renewal: string | null, value: number, active = true): Client => ({
  id, name: `Cliente ${id}`, segment: null, logo_url: null, contract_value: value,
  contract_renewal_date: renewal, owner_manager_id: "m1", active, custom_fields: {}, created_at: "2026-01-01",
});
const plan = (clientId: string, status: ClientCommercialPlan["status"] = "em_negociacao"): ClientCommercialPlan => ({
  id: `p-${clientId}`, client_id: clientId, owner_manager_id: "m1", status, probability: 60,
  expected_renewal_value: 1000, expansion_value: 500, next_step: "Enviar proposta", next_step_due_date: "2026-08-01",
  notes: null, created_by: "u1", updated_by: "u1", created_at: "2026-07-01", updated_at: "2026-07-01",
});

describe("renewal-expansion", () => {
  it("calcula os componentes da previsão ponderada", () => {
    expect(weightedCommercialValues(plan("c1"))).toEqual({ renewal: 600, expansion: 300, total: 900 });
  });

  it("consolida janelas de 90 e 180 dias por data civil", () => {
    const result = buildRenewalPortfolioSummary([
      client("c1", "2026-10-26", 1000),
      client("c2", "2026-10-27", 2000),
      client("c3", "2027-01-24", 3000),
    ], [plan("c1")], "2026-07-28");
    expect(result.activeContractValue).toBe(6000);
    expect(result.renewalValue90Days).toBe(1000);
    expect(result.renewalValue180Days).toBe(6000);
    expect(result.upcoming.map((item) => item.daysRemaining)).toEqual([90, 91, 180]);
  });

  it("ignora clientes inativos e planos perdidos ou já renovados no pipeline", () => {
    const result = buildRenewalPortfolioSummary([
      client("c1", "2026-08-01", 1000), client("c2", "2026-08-02", 2000, false), client("c3", "2026-08-03", 3000),
    ], [plan("c1", "perdido"), plan("c2"), plan("c3", "renovado")], "2026-07-28");
    expect(result.activeContractValue).toBe(4000);
    expect(result.weightedRenewalPipeline).toBe(0);
    expect(result.weightedExpansionPipeline).toBe(0);
    expect(result.upcoming).toHaveLength(2);
  });
});
