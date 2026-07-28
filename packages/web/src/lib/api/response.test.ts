import { describe, expect, it } from "vitest";
import { pagination, readJson, validIsoDate } from "@/lib/api/response";

describe("API response helpers", () => {
  it("limita paginação", () => {
    expect(pagination(new URLSearchParams("limit=999&offset=-2"))).toEqual({ limit: 100, offset: 0 });
    expect(pagination(new URLSearchParams("limit=x&offset=x"))).toEqual({ limit: 50, offset: 0 });
  });

  it("rejeita JSON inválido e payload declarado acima do limite", async () => {
    expect(await readJson(new Request("http://local", { method: "POST", body: "{" }))).toEqual({ ok: false });
    expect(await readJson(new Request("http://local", { method: "POST", body: "{}", headers: { "content-length": "999" } }), 10)).toEqual({ ok: false });
  });

  it("valida datas reais no formato ISO", () => {
    expect(validIsoDate("2026-07-28")).toBe(true);
    expect(validIsoDate("2026-02-31")).toBe(false);
  });
});
