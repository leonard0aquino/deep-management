import { describe, expect, it } from "vitest";
import { generateExecutiveBriefing } from "@/services/insights";
import type { Client, ClientHealth, InteractionView, Product } from "@/lib/types/database";

const DAY_MS = 86_400_000;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
}

function interaction(overrides: Partial<InteractionView>): InteractionView {
  return {
    id: "i1", client_id: "c1", product_id: "p1", manager_id: null, contact_id: null,
    interaction_type: "meeting", topic: "Renovação", notes: null, relevance: 3,
    occurred_at: isoDaysAgo(0), links: [], created_by: null, created_at: "2026-01-01",
    updated_at: "2026-01-01", client_name: "Acme", product_name: "Suite",
    product_color: null, manager_name: null, contact_name: null, days_since_contact: 0,
    status: "ok",
    ...overrides,
  };
}

const client: Client = {
  id: "c1", name: "Acme", segment: null, logo_url: null, contract_value: null,
  contract_renewal_date: null, active: true, custom_fields: {}, created_at: "2026-01-01",
};

const product: Product = {
  id: "p1", name: "Suite", slug: "suite", color: null, active: true, created_at: "2026-01-01",
};

const scoreSettings = { threshold_ok_dias: 21, threshold_alerta_dias: 90 };

function health(overrides: Partial<ClientHealth>): ClientHealth {
  return {
    client_id: "c1", client_name: "Acme", score: 80, days_since_last_contact: 45,
    tracked_products: 1, critical_products: 0,
    ...overrides,
  };
}

describe("generateExecutiveBriefing — chaves de deduplicação", () => {
  it("gera a mesma chave para a mesma interação em execuções (dias) diferentes", () => {
    const theInteraction = interaction({ id: "i-fixed", occurred_at: isoDaysAgo(1) });
    const result = generateExecutiveBriefing({
      interactions: [theInteraction], matrix: [], clientHealth: [], clients: [client], products: [product],
      scoreSettings,
    });
    const followup = result.find((item) => item.key.startsWith("followup:"));
    expect(followup?.key).toBe("followup:i-fixed");
  });

  it("duas interações diferentes do mesmo cliente geram chaves diferentes", () => {
    const result = generateExecutiveBriefing({
      interactions: [interaction({ id: "i-a" })],
      matrix: [], clientHealth: [], clients: [client], products: [product],
      scoreSettings,
    });
    expect(result.find((i) => i.key.startsWith("followup:"))?.key).toBe("followup:i-a");
  });

  it("cliente sem contato gera chave com a data (no máximo uma notificação por dia)", () => {
    const result = generateExecutiveBriefing({
      interactions: [], matrix: [], clientHealth: [health({})], clients: [client], products: [product],
      scoreSettings,
    });
    const stale = result.find((item) => item.key.startsWith("stale:"));
    expect(stale?.key).toBe(`stale:c1:${isoDaysAgo(0)}`);
  });

  it("o texto do item 'sem contato' muda com os dias, mas isso não afeta a chave (evita duplicata diária)", () => {
    const day1 = generateExecutiveBriefing({
      interactions: [], matrix: [], clientHealth: [health({ days_since_last_contact: 45 })], clients: [client], products: [product],
      scoreSettings,
    }).find((i) => i.key.startsWith("stale:"));
    const day2 = generateExecutiveBriefing({
      interactions: [], matrix: [], clientHealth: [health({ days_since_last_contact: 46 })], clients: [client], products: [product],
      scoreSettings,
    }).find((i) => i.key.startsWith("stale:"));
    expect(day1?.text).not.toBe(day2?.text);
    expect(day1?.key).toBe(day2?.key);
  });
});
