import { describe, expect, it } from "vitest";
import { calculateSuccessPlanProgress } from "@/services/success-plans";

describe("calculateSuccessPlanProgress", () => {
  it("retorna zero quando não há marcos", () => {
    expect(calculateSuccessPlanProgress([])).toBe(0);
  });

  it("calcula a proporção de marcos concluídos", () => {
    expect(calculateSuccessPlanProgress([
      { status: "concluido" },
      { status: "pendente" },
      { status: "em_andamento" },
    ])).toBe(33);
  });

  it("desconsidera marcos cancelados", () => {
    expect(calculateSuccessPlanProgress([
      { status: "concluido" },
      { status: "cancelado" },
    ])).toBe(100);
  });

  it("retorna zero quando todos os marcos foram cancelados", () => {
    expect(calculateSuccessPlanProgress([{ status: "cancelado" }])).toBe(0);
  });
});
