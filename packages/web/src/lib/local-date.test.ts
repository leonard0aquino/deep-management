import { describe, expect, it } from "vitest";
import { businessDateIso, formatLocalDateGroup, parseLocalDate } from "@/lib/local-date";

const NOW = new Date(2026, 6, 22, 15);

describe("datas civis locais", () => {
  it("calcula a data civil operacional em São Paulo", () => {
    expect(businessDateIso(new Date("2026-07-30T02:30:00.000Z"))).toBe("2026-07-29");
  });

  it("interpreta YYYY-MM-DD sem deslocar o dia pelo fuso", () => {
    const date = parseLocalDate("2026-07-22");
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 6, 22]);
  });

  it("agrupa o dia atual como Hoje", () => {
    expect(formatLocalDateGroup("2026-07-22", NOW)).toBe("Hoje");
  });

  it("agrupa o dia anterior como Ontem", () => {
    expect(formatLocalDateGroup("2026-07-21", NOW)).toBe("Ontem");
  });

  it("formata datas anteriores em português", () => {
    expect(formatLocalDateGroup("2026-07-20", NOW)).toMatch(/20 de julho/);
  });
});
