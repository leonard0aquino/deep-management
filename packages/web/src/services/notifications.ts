import type { SupabaseClient } from "@supabase/supabase-js";
import type { BriefingItem } from "@/services/insights";
import type { DatabaseSchema } from "@/lib/types/database";

/**
 * Gera notificações in-app a partir dos itens críticos/de atenção do
 * Executive Briefing, evitando duplicar a mesma notificação em menos de
 * 24h (idempotente por título).
 */
export async function syncNotifications(
  supabase: SupabaseClient<DatabaseSchema>,
  items: BriefingItem[],
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: preferences } = await supabase
    .from("notification_preferences")
    .select("risk, opportunity")
    .eq("user_id", user.id)
    .maybeSingle();

  const relevant = items.filter((item) => {
    if (item.tone === "critical" || item.tone === "warning") return preferences?.risk !== false;
    if (item.tone === "positive") return preferences?.opportunity !== false;
    return false;
  });
  if (relevant.length === 0) return;

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recent } = await supabase
    .from("notifications")
    .select("title")
    .eq("user_id", user.id)
    .gte("created_at", cutoff);

  const existingTitles = new Set((recent ?? []).map((n) => n.title));
  const toInsert = relevant
    .filter((i) => !existingTitles.has(i.text))
    .map((i) => ({
      user_id: user.id,
      title: i.text,
      body: null,
      href: "/",
      read: false,
      severity: i.tone === "critical" ? "critical" as const : i.tone === "warning" ? "warning" as const : "opportunity" as const,
      category: i.tone === "positive" ? "opportunity" as const : "risk" as const,
    }));

  if (toInsert.length > 0) {
    await supabase.from("notifications").insert(toInsert);
  }
}
