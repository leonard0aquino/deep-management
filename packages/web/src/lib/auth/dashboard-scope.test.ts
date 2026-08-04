import { describe, expect, it } from "vitest";
import { scopeDashboardData } from "@/lib/auth/dashboard-scope";
import type { DashboardData } from "@/lib/data";

const matrixRow = (clientId: string, productId: string, score: number): DashboardData["matrix"][number] => ({
  client_id: clientId, client_name: clientId, product_id: productId, product_name: productId,
  product_color: null, last_contact: "2026-07-30", interaction_count: 1, avg_relevance: 4,
  days_since_contact: 0, status: score < 50 ? "critico" : "recente", recency_score: score,
  frequency_score: score, relevance_score: score, participation_score: score,
  diversity_score: score, composite_score: score,
});

const baseData = {
  interactions: [
    { id: "i1", client_id: "c1", product_id: "p1", topic: "A" },
    { id: "i2", client_id: "c1", product_id: "p2", topic: "B" },
  ] as DashboardData["interactions"],
  matrix: [matrixRow("c1", "p1", 40), matrixRow("c1", "p2", 90)],
  healthScore: { score: 65, critical_count: 1, tracked_combinations: 2 },
  clientHealth: [],
  stakeholders: [{ contact_id: "s1", client_id: "c1" }] as DashboardData["stakeholders"],
  clients: [{ id: "c1", name: "Cliente" }] as DashboardData["clients"],
  products: [{ id: "p1", name: "P1" }, { id: "p2", name: "P2" }] as DashboardData["products"],
  managers: [
    { id: "m1", name: "Ana", active: true, linked_user_id: "u1" },
    { id: "m2", name: "Bia", active: true, linked_user_id: "u2" },
  ] as DashboardData["managers"],
  contacts: [{ id: "s1", client_id: "c1", name: "Contato" }] as DashboardData["contacts"],
  clientProducts: [
    { id: "cp1", client_id: "c1", product_id: "p1", owner_manager_id: "m1", active: true },
    { id: "cp2", client_id: "c1", product_id: "p2", owner_manager_id: "m2", active: true },
  ] as DashboardData["clientProducts"],
  clientProductOwners: [
    { id: "cpo1", client_product_id: "cp1", manager_id: "m1", active: true },
    { id: "cpo2", client_product_id: "cp1", manager_id: "m2", active: true },
    { id: "cpo3", client_product_id: "cp2", manager_id: "m2", active: true },
  ] as DashboardData["clientProductOwners"],
  scoreSettings: {
    id: true, target_score: 85, weight_recency: 0.35, weight_frequency: 0.25,
    weight_relevance: 0.2, weight_participation: 0.1, weight_diversity: 0.1,
    threshold_recente_dias: 7, threshold_ok_dias: 21, threshold_atencao_dias: 45,
    threshold_alerta_dias: 90, updated_at: "2026-07-30T00:00:00Z",
  },
  commercialPlans: [{ id: "plan1", client_id: "c1" }] as DashboardData["commercialPlans"],
  playbooks: [],
  playbookSteps: [],
  cadences: [
    { id: "cad1", client_id: "c1", product_id: "p1" },
    { id: "cad2", client_id: "c1", product_id: "p2" },
  ] as DashboardData["cadences"],
} as DashboardData;

describe("escopo do dashboard", () => {
  it.each(["admin", "executivo"] as const)("preserva a carteira integral para %s", (role) => {
    expect(scopeDashboardData(baseData, { userId: "u", role, businessArea: "customer_success", managerIds: [] })).toBe(baseData);
  });

  it("recorta pelo par cliente/produto atribuído ao responsável", () => {
    const scoped = scopeDashboardData(baseData, { userId: "u1", role: "gerente", businessArea: "customer_success", managerIds: ["m1"] });
    expect(scoped.clientProducts.map((item) => item.id)).toEqual(["cp1"]);
    expect(scoped.matrix.map((item) => item.product_id)).toEqual(["p1"]);
    expect(scoped.interactions.map((item) => item.id)).toEqual(["i1"]);
    expect(scoped.products.map((item) => item.id)).toEqual(["p1"]);
    expect(scoped.managers.map((item) => item.id)).toEqual(["m1", "m2"]);
    expect(scoped.clientProductOwners.map((item) => item.id)).toEqual(["cpo1", "cpo2"]);
    expect(scoped.healthScore).toEqual({ score: 40, critical_count: 1, tracked_combinations: 1 });
    expect(scoped.clientHealth[0]).toMatchObject({ client_id: "c1", tracked_products: 1, score: 40 });
  });

  it("não faz fallback global quando o usuário não está vinculado", () => {
    const scoped = scopeDashboardData(baseData, { userId: "u3", role: "analista", businessArea: "customer_success", managerIds: [] });
    expect(scoped.clients).toEqual([]);
    expect(scoped.products).toEqual([]);
    expect(scoped.interactions).toEqual([]);
    expect(scoped.healthScore.tracked_combinations).toBe(0);
  });

  it("agrega as carteiras dos responsáveis da estrutura", () => {
    const scoped = scopeDashboardData(baseData, { userId: "u1", role: "gerente", businessArea: "customer_success", managerIds: ["m1", "m2"] });
    expect(scoped.clientProducts.map((item) => item.id)).toEqual(["cp1", "cp2"]);
    expect(scoped.managers.map((item) => item.id)).toEqual(["m1", "m2"]);
    expect(scoped.healthScore.tracked_combinations).toBe(2);
  });
});
