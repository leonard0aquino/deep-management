import { describe, expect, it, vi } from "vitest";
import { syncNotifications } from "@/services/notifications";
import type { DatabaseSchema } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

function client(user: { id: string } | null, preferences = { risk: true, opportunity: false }, existingKeys: { dedupe_key: string }[] = []) {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => table === "notification_preferences" ? {
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: preferences }) }) }),
  } : {
    select: () => ({ eq: () => ({ in: async () => ({ data: existingKeys }) }) }), insert,
  });
  return { supabase: { auth: { getUser: async () => ({ data: { user } }) }, from } as unknown as SupabaseClient<DatabaseSchema>, insert, from };
}

describe("syncNotifications", () => {
  it("não consulta tabelas sem usuário", async () => {
    const mock = client(null);
    await syncNotifications(mock.supabase, [{ tone: "critical", text: "Risco", key: "risco:1" }]);
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("respeita preferências, deduplica por chave e cria payload por severidade", async () => {
    const mock = client({ id: "u1" }, undefined, [{ dedupe_key: "duplicada:1" }]);
    await syncNotifications(mock.supabase, [
      { tone: "critical", text: "Risco", key: "risco:1" },
      { tone: "warning", text: "Duplicada", key: "duplicada:1" },
      { tone: "positive", text: "Oportunidade", key: "oportunidade:1" },
    ]);
    expect(mock.insert).toHaveBeenCalledWith([expect.objectContaining({ user_id: "u1", title: "Risco", severity: "critical", category: "risk", dedupe_key: "risco:1" })]);
  });

  it("não deduplica por texto — a mesma chave bloqueia mesmo com texto diferente", async () => {
    const mock = client({ id: "u1" }, undefined, [{ dedupe_key: "stale:c1:2026-07-24" }]);
    await syncNotifications(mock.supabase, [
      { tone: "warning", text: "Acme está há 45 dias sem contato.", key: "stale:c1:2026-07-24" },
    ]);
    expect(mock.insert).not.toHaveBeenCalled();
  });
});
