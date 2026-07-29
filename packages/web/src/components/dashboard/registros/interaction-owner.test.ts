import { describe, expect, it } from "vitest";
import { ownerForCombination } from "@/components/dashboard/registros/interaction-form-dialog";
import type { ClientProduct } from "@/lib/types/database";

const assignment = (productId: string, ownerManagerId: string | null, active = true): ClientProduct => ({
  id: `cp-${productId}`,
  client_id: "c1",
  product_id: productId,
  owner_manager_id: ownerManagerId,
  contract_value: null,
  renewal_date: null,
  active,
  created_at: "2026-07-28T12:00:00Z",
  updated_at: "2026-07-28T12:00:00Z",
});

describe("responsável por cliente e produto", () => {
  it("retorna responsáveis diferentes para produtos do mesmo cliente", () => {
    const assignments = [assignment("p1", "m1"), assignment("p2", "m2")];
    expect(ownerForCombination(assignments, "c1", "p1")).toBe("m1");
    expect(ownerForCombination(assignments, "c1", "p2")).toBe("m2");
  });

  it("não sugere responsável para vínculo inexistente, inativo ou sem atribuição", () => {
    expect(ownerForCombination([assignment("p1", null)], "c1", "p1")).toBe("");
    expect(ownerForCombination([assignment("p1", "m1", false)], "c1", "p1")).toBe("");
    expect(ownerForCombination([], "c1", "p1")).toBe("");
  });
});
