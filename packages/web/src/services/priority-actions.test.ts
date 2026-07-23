import { describe, expect, it, vi } from "vitest";
import { generatePriorityActions } from "@/services/priority-actions";
import type { ClientProductMatrixRow, InteractionView } from "@/lib/types/database";

const row = (overrides: Partial<ClientProductMatrixRow> = {}): ClientProductMatrixRow => ({
  client_id: "c1", client_name: "Cliente", product_id: "p1", product_name: "Produto",
  composite_score: 50, status: "critico", days_since_contact: 10, ...overrides,
} as ClientProductMatrixRow);

describe("generatePriorityActions", () => {
  it("gera chaves estáveis, responsável e ordena criticidade antes de aging", () => {
    vi.setSystemTime(new Date("2026-07-22T12:00:00Z"));
    const interactions = [{ client_id: "c1", product_id: "p1", manager_name: "Ana" }] as InteractionView[];
    const result = generatePriorityActions([
      row({ client_id: "c2", product_id: "p2", status: "ok", days_since_contact: 45 }),
      row(),
      row({ client_id: "c3", product_id: "p3", status: "alerta", days_since_contact: 20 }),
    ], interactions);
    expect(result.map((item) => item.key)).toEqual(["v1:c1:p1:critical", "v1:c3:p3:alert", "v1:c2:p2:stale"]);
    expect(result[0]).toMatchObject({ managerName: "Ana", priority: "alta" });
  });

  it("ignora relacionamentos saudáveis e recentes", () => {
    expect(generatePriorityActions([row({ status: "ok", days_since_contact: 10 })], [])).toEqual([]);
  });
});
