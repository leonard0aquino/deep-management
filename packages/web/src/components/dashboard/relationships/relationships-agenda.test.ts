import { describe, expect, it } from "vitest";
import {
  filterActivityInteractions,
  productsForActivityClient,
} from "@/components/dashboard/relationships/relationships-agenda";
import type { ClientProduct, InteractionView, Product } from "@/lib/types/database";

const products = [
  { id: "p1", name: "Suite" },
  { id: "p2", name: "Portal" },
  { id: "p3", name: "Dados" },
] as Product[];

const assignments = [
  { id: "cp1", client_id: "c1", product_id: "p1", active: true },
  { id: "cp2", client_id: "c1", product_id: "p2", active: false },
  { id: "cp3", client_id: "c2", product_id: "p3", active: true },
] as ClientProduct[];

const interactions = [
  { id: "i1", client_id: "c1", product_id: "p1", manager_id: "m1", interaction_type: "meeting" },
  { id: "i2", client_id: "c2", product_id: "p3", manager_id: "m2", interaction_type: "email" },
] as InteractionView[];

describe("filtros da agenda de atividades", () => {
  it("mostra somente produtos ativos da combinação selecionada", () => {
    expect(productsForActivityClient(products, assignments, "c1").map((item) => item.id)).toEqual(["p1"]);
  });

  it("combina filtros usando IDs estáveis", () => {
    expect(filterActivityInteractions(interactions, {
      managerId: "m1",
      clientId: "c1",
      productId: "p1",
      type: "meeting",
    }).map((item) => item.id)).toEqual(["i1"]);
  });
});
