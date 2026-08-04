import { describe, expect, it } from "vitest";
import type { Client } from "@/lib/types/database";
import { buildGovernanceSummary } from "@/services/governance";

function client(id: string, overrides: Partial<Client> = {}): Client {
  return {
    id,
    name: `Cliente ${id}`,
    segment: null,
    logo_url: null,
    contract_value: 1000,
    contract_renewal_date: "2026-12-01",
    owner_manager_id: "m1",
    client_kind: "customer",
    active: true,
    custom_fields: {},
    created_at: "2026-01-01",
    ...overrides,
  };
}

describe("governança da carteira", () => {
  it("calcula pendências sem contar clientes inativos", () => {
    const summary = buildGovernanceSummary({
      clients: [
        client("c1"),
        client("c2", { owner_manager_id: null, contract_value: null, contract_renewal_date: null }),
        client("c3", { active: false, owner_manager_id: null }),
      ],
      interactions: [{ client_id: "c1" }],
    });

    expect(summary.activeClients).toBe(2);
    expect(summary.compliantClients).toBe(1);
    expect(summary.complianceRate).toBe(50);
    expect(summary.issues.find((issue) => issue.key === "owner")?.clientIds).toEqual(["c2"]);
    expect(summary.issues.find((issue) => issue.key === "interaction")?.clientIds).toEqual(["c2"]);
  });

  it("considera uma carteira vazia integralmente regular", () => {
    const summary = buildGovernanceSummary({ clients: [], interactions: [] });
    expect(summary.complianceRate).toBe(100);
    expect(summary.issues.every((issue) => issue.clientIds.length === 0)).toBe(true);
  });
});
