import type { SupabaseClient } from "@supabase/supabase-js";
import type { BriefingItem } from "@/services/insights";
import type { DatabaseSchema } from "@/lib/types/database";

/**
 * Gera notificações in-app a partir dos itens críticos/de atenção do
 * Executive Briefing, deduplicando por `dedupe_key` (identidade estável do
 * evento de origem — ver BriefingItem.key). Eventos únicos (uma interação
 * específica) nunca se repetem; riscos contínuos incluem a data na chave e
 * por isso notificam no máximo uma vez por dia enquanto a condição
 * persistir. Não usamos janela de tempo: a própria chave já encode a
 * granularidade correta, então uma checagem "existe esta chave?" sem
 * limite de data é suficiente e evita duplicatas mesmo quando o texto
 * exibido muda (ex.: contagem de dias sem contato).
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

  const { data: existing } = await supabase
    .from("notifications")
    .select("dedupe_key")
    .eq("user_id", user.id)
    .in("dedupe_key", relevant.map((i) => i.key));

  const existingKeys = new Set((existing ?? []).map((n) => n.dedupe_key));
  const toInsert = relevant
    .filter((i) => !existingKeys.has(i.key))
    .map((i) => ({
      user_id: user.id,
      title: i.text,
      body: null,
      href: "/",
      read: false,
      severity: i.tone === "critical" ? "critical" as const : i.tone === "warning" ? "warning" as const : "opportunity" as const,
      category: i.tone === "positive" ? "opportunity" as const : "risk" as const,
      dedupe_key: i.key,
    }));

  if (toInsert.length > 0) {
    await supabase.from("notifications").insert(toInsert);
  }
}
