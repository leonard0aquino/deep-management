import { describe, expect, it } from "vitest";
import {
  ownerForCombination,
  ownerIdsForCombination,
  productsForAssignedClient,
  suggestedOwnerForCombination,
} from "@/components/dashboard/registros/interaction-form-dialog";
import type { ClientProduct, ClientProductOwner, Product } from "@/lib/types/database";

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

  it("retorna todos os corresponsáveis da combinação sem duplicar", () => {
    const assignments = [assignment("p1", "m1")];
    const owners = [
      { id: "o1", client_product_id: "cp-p1", manager_id: "m1", active: true },
      { id: "o2", client_product_id: "cp-p1", manager_id: "m2", active: true },
      { id: "o3", client_product_id: "cp-p1", manager_id: "m3", active: false },
    ] as ClientProductOwner[];

    expect(ownerIdsForCombination(assignments, owners, "c1", "p1")).toEqual(["m1", "m2"]);
    expect(suggestedOwnerForCombination(assignments, owners, "c1", "p1")).toBe("");
  });
});

describe("produtos disponíveis por cliente", () => {
  const products = [
    { id: "p1", name: "P1" },
    { id: "p2", name: "P2" },
    { id: "p3", name: "P3" },
  ] as Product[];

  it("retorna somente produtos ativos atribuídos ao cliente", () => {
    const assignments = [
      assignment("p1", "m1"),
      assignment("p2", "m1", false),
      { ...assignment("p3", "m1"), client_id: "c2" },
    ];

    expect(productsForAssignedClient(products, assignments, "c1").map((item) => item.id)).toEqual(["p1"]);
  });
});
