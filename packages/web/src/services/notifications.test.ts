import { describe, expect, it, vi } from "vitest";
import { syncNotifications } from "@/services/notifications";
import type { DatabaseSchema } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

function client(user: { id: string } | null, preferences = { risk: true, opportunity: false }, recent: { title: string }[] = []) {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => table === "notification_preferences" ? {
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: preferences }) }) }),
  } : {
    select: () => ({ eq: () => ({ gte: async () => ({ data: recent }) }) }), insert,
  });
  return { supabase: { auth: { getUser: async () => ({ data: { user } }) }, from } as unknown as SupabaseClient<DatabaseSchema>, insert, from };
}

describe("syncNotifications", () => {
  it("não consulta tabelas sem usuário", async () => {
    const mock = client(null);
    await syncNotifications(mock.supabase, [{ tone: "critical", text: "Risco" }]);
    expect(mock.from).not.toHaveBeenCalled();
  });
  it("respeita preferências, deduplica e cria payload por severidade", async () => {
    const mock = client({ id: "u1" }, undefined, [{ title: "Duplicada" }]);
    await syncNotifications(mock.supabase, [
      { tone: "critical", text: "Risco" }, { tone: "warning", text: "Duplicada" }, { tone: "positive", text: "Oportunidade" },
    ]);
    expect(mock.insert).toHaveBeenCalledWith([expect.objectContaining({ user_id: "u1", title: "Risco", severity: "critical", category: "risk" })]);
  });
});
