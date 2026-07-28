import { describe, expect, it } from "vitest";
import type { Client, StakeholderHealth } from "@/lib/types/database";
import { buildStakeholderCoverage, summarizeStakeholderPortfolio } from "@/services/stakeholder-coverage";

function stakeholder(id: string, role: StakeholderHealth["relationship_role"], overrides: Partial<StakeholderHealth> = {}): StakeholderHealth {
  return {
    contact_id: id, client_id: "c1", client_name: "Acme", name: `Pessoa ${id}`, role: null, email: null, phone: null,
    influence: "alta", relationship_role: role, owner_manager_id: "m1", owner_manager_name: "Marina", photo_url: null,
    reports_to_contact_id: null, last_contact: "2026-07-20", interaction_count: 2, last_customer_sentiment: "neutral",
    sentiment_recorded_at: "2026-07-20", days_since_contact: 8, status: "ok", score: 80, risk: "baixo", ...overrides,
  };
}

const client = (id: string, active = true): Client => ({ id, name: id, segment: null, logo_url: null, contract_value: null, contract_renewal_date: null, owner_manager_id: null, active, custom_fields: {}, created_at: "2026-01-01" });

describe("stakeholder coverage", () => {
  it("expõe os quatro papéis estratégicos sem pontuação opaca", () => {
    const result = buildStakeholderCoverage([
      stakeholder("s", "patrocinador"), stakeholder("d", "decisor"), stakeholder("i", "influenciador"), stakeholder("u", "usuario_chave"),
    ]);
    expect(result.coveredRoles).toEqual(["patrocinador", "decisor", "influenciador", "usuario_chave"]);
    expect(result.strategicPeopleCount).toBe(4);
    expect(result.isRelationshipConcentrated).toBe(false);
  });

  it("identifica concentração e ausência de patrocinador e decisor", () => {
    const result = buildStakeholderCoverage([stakeholder("o", "contato_operacional")]);
    expect(result.isRelationshipConcentrated).toBe(true);
    expect(result.hasSponsor).toBe(false);
    expect(result.hasDecisionMaker).toBe(false);
  });

  it("sinaliza patrocinador sem contato, há mais de 30 dias ou com sentimento negativo", () => {
    const result = buildStakeholderCoverage([
      stakeholder("a", "patrocinador", { days_since_contact: null, last_contact: null }),
      stakeholder("b", "patrocinador", { days_since_contact: 31 }),
      stakeholder("c", "patrocinador", { last_customer_sentiment: "negative" }),
    ]);
    expect(result.coolingSponsors.map((item) => item.contact_id)).toEqual(["a", "b", "c"]);
  });

  it("consolida somente clientes ativos, inclusive os sem pessoas", () => {
    const rows = [stakeholder("s", "patrocinador"), stakeholder("d", "decisor"), { ...stakeholder("x", "patrocinador"), client_id: "c2" }];
    const result = summarizeStakeholderPortfolio([client("c1"), client("c2", false), client("c3")], rows);
    expect(result.concentratedClients).toBe(1);
    expect(result.clientsWithoutSponsor).toBe(1);
    expect(result.clientsWithoutDecisionMaker).toBe(1);
  });
});
