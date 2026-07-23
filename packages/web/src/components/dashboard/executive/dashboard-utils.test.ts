import { describe, expect, it } from "vitest";
import { updateDashboardFilter } from "@/components/dashboard/executive/dashboard-filters";
import { csvCell, queryToFilters } from "@/components/dashboard/executive/saved-dashboard-views";

describe("dashboard URL e exportação", () => {
  it("preserva filtros, remove a visão e altera o parâmetro solicitado", () => {
    expect(updateDashboardFilter("client=c1&view=risk", "status", "critico")).toBe("client=c1&status=critico");
    expect(updateDashboardFilter("client=c1&status=ok", "status", "")).toBe("client=c1");
  });
  it("mantém apenas chaves permitidas", () => {
    expect(queryToFilters("client=c1&evil=x&period=30")).toEqual({ client: "c1", period: "30" });
  });
  it("escapa aspas, vírgulas e quebras no CSV", () => {
    expect(csvCell('ACME, "Brasil"')).toBe('"ACME, ""Brasil"""');
    expect(csvCell("simples")).toBe("simples");
  });
});
