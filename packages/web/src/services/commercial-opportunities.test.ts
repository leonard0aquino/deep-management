import { describe, expect, it } from "vitest";
import type { CommercialOpportunity } from "@/lib/types/database";
import { buildCommercialFunnel, filterCommercialOpportunities } from "@/services/commercial-opportunities";

const opportunity = (id: string, overrides: Partial<CommercialOpportunity> = {}): CommercialOpportunity => ({
  id,
  client_id: "c1",
  product_id: null,
  owner_manager_id: "m1",
  name: `Oportunidade ${id}`,
  stage: "prospecting",
  amount: 1000,
  probability: 10,
  next_step: null,
  next_step_at: null,
  closed_at: null,
  loss_reason: null,
  created_by: "u1",
  updated_by: "u1",
  created_at: "2026-08-04T10:00:00Z",
  updated_at: "2026-08-04T10:00:00Z",
  ...overrides,
});

describe("operações do funil Comercial", () => {
  it("filtra por etapa, responsável e busca normalizada", () => {
    const rows = [
      opportunity("1", { name: "Expansão Ágata", owner_manager_id: "m1" }),
      opportunity("2", { name: "Nova conta", owner_manager_id: "m2", stage: "proposal" }),
    ];
    expect(filterCommercialOpportunities(rows, { search: "ágata" }).map((item) => item.id)).toEqual(["1"]);
    expect(filterCommercialOpportunities(rows, { ownerManagerId: "m2", stage: "proposal" }).map((item) => item.id)).toEqual(["2"]);
  });

  it("agrega volume, valor bruto e ponderado em todas as etapas", () => {
    const funnel = buildCommercialFunnel([
      opportunity("1", { stage: "proposal", amount: 10_000, probability: 40 }),
      opportunity("2", { stage: "proposal", amount: 5_000, probability: 80 }),
      opportunity("3", { stage: "won", amount: 2_000, probability: 100 }),
    ]);
    expect(funnel).toHaveLength(8);
    expect(funnel.find((item) => item.stage === "proposal")).toMatchObject({ count: 2, amount: 15_000, weightedAmount: 8_000 });
    expect(funnel.find((item) => item.stage === "won")).toMatchObject({ count: 1, amount: 2_000, weightedAmount: 2_000 });
  });
});
