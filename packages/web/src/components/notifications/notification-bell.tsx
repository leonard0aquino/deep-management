"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Settings2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types/database";

type StatusFilter = "all" | "unread";
type SeverityFilter = "all" | Notification["severity"];
type PreferenceKey = "risk" | "opportunity" | "relationship" | "system";

const severityLabel: Record<Notification["severity"], string> = {
  critical: "Crítico", warning: "Atenção", opportunity: "Oportunidade", info: "Informativo",
};
const severityStyle: Record<Notification["severity"], string> = {
  critical: "bg-red-500", warning: "bg-amber-500", opportunity: "bg-emerald-500", info: "bg-blue-500",
};
const preferenceLabel: Record<PreferenceKey, string> = {
  risk: "Riscos", opportunity: "Oportunidades", relationship: "Relacionamento", system: "Sistema",
};
const defaultPreferences = { risk: true, opportunity: true, relationship: true, system: true };

function relativeDate(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
}

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !active) return;
      setUserId(user.id);
      const [{ data: notifications, error: notificationError }, { data: preferenceData, error: preferenceError }] = await Promise.all([
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      if (notificationError || preferenceError) {
        setFeedback("Não foi possível carregar todas as notificações. Tente novamente.");
      }
      setItems(notifications ?? []);
      if (preferenceData) setPreferences(preferenceData);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase.channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (payload) => {
        const next = payload.new as Notification;
        if (next.user_id !== userId && next.user_id !== null) return;
        if (payload.eventType === "INSERT") setItems((current) => [next, ...current].slice(0, 40));
        if (payload.eventType === "UPDATE") setItems((current) => current.map((item) => item.id === next.id ? next : item));
      }).subscribe((subscriptionStatus) => {
        if (subscriptionStatus === "CHANNEL_ERROR") setFeedback("Atualização em tempo real indisponível. Reabra as notificações para atualizar.");
      });
    return () => { void supabase.removeChannel(channel); };
  }, [userId]);

  const unread = items.filter((item) => !item.read).length;
  const visible = useMemo(() => items.filter((item) =>
    (status === "all" || !item.read) && (severity === "all" || item.severity === severity)
  ), [items, severity, status]);

  async function markRead(item: Notification) {
    if (item.read) return true;
    const readAt = new Date().toISOString();
    const supabase = createClient();
    const { error } = await supabase.from("notifications").update({ read: true, read_at: readAt }).eq("id", item.id);
    if (error) {
      setFeedback("Não foi possível marcar a notificação como lida.");
      return false;
    }
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true, read_at: readAt } : entry));
    setFeedback(null);
    return true;
  }

  async function markAllRead() {
    const ids = items.filter((item) => !item.read).map((item) => item.id);
    if (ids.length === 0) return;
    const readAt = new Date().toISOString();
    const supabase = createClient();
    const { error } = await supabase.from("notifications").update({ read: true, read_at: readAt }).in("id", ids);
    if (error) {
      setFeedback("Não foi possível marcar todas como lidas.");
      return;
    }
    setItems((current) => current.map((item) => ids.includes(item.id) ? { ...item, read: true, read_at: readAt } : item));
    setFeedback("Todas as notificações foram marcadas como lidas.");
  }

  async function openNotification(item: Notification) {
    void markRead(item);
    if (item.href) router.push(item.href);
  }

  async function togglePreference(key: PreferenceKey) {
    if (!userId) return;
    const next = { ...preferences, [key]: !preferences[key] };
    const supabase = createClient();
    const { error } = await supabase.from("notification_preferences").upsert({ user_id: userId, ...next }, { onConflict: "user_id" });
    if (error) {
      setFeedback("Não foi possível salvar as preferências.");
      return;
    }
    setPreferences(next);
    setFeedback("Preferências atualizadas.");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`} title="Notificações" className={buttonVariants({ variant: "ghost", size: "icon", className: "relative" })}>
        <Bell className="h-4 w-4" />
        {unread > 0 && <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">{unread > 99 ? "99+" : unread}</Badge>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(400px,calc(100vw-24px))] overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div><p className="text-sm font-semibold">Notificações</p><p className="text-xs text-muted-foreground">{unread ? `${unread} não lida${unread > 1 ? "s" : ""}` : "Tudo em dia"}</p></div>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => void markAllRead()} disabled={!unread} aria-label="Marcar todas como lidas" title="Marcar todas como lidas"><CheckCheck /></Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShowPreferences((value) => !value)} aria-label="Configurar notificações" title="Preferências"><Settings2 /></Button>
          </div>
        </div>

        {feedback && <p className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground" role="status">{feedback}</p>}

        {showPreferences ? (
          <div className="space-y-3 p-4">
            <div><p className="text-sm font-medium">Preferências</p><p className="text-xs text-muted-foreground">Escolha os tipos de alerta que deseja receber.</p></div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(preferenceLabel) as PreferenceKey[]).map((key) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs">
                  <input type="checkbox" checked={preferences[key]} onChange={() => void togglePreference(key)} className="accent-primary" />
                  {preferenceLabel[key]}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 border-b p-3">
              <select aria-label="Filtrar por status" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="h-8 flex-1 rounded-md border bg-background px-2 text-xs">
                <option value="all">Todas</option><option value="unread">Não lidas</option>
              </select>
              <select aria-label="Filtrar por severidade" value={severity} onChange={(event) => setSeverity(event.target.value as SeverityFilter)} className="h-8 flex-1 rounded-md border bg-background px-2 text-xs">
                <option value="all">Todas as severidades</option><option value="critical">Crítico</option><option value="warning">Atenção</option><option value="opportunity">Oportunidade</option><option value="info">Informativo</option>
              </select>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {visible.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma notificação neste filtro.</p>}
              {visible.map((item) => (
                <button key={item.id} type="button" onClick={() => void openNotification(item)} className={`flex w-full gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${item.read ? "opacity-70" : "bg-muted/20"}`}>
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${severityStyle[item.severity]}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2"><span className="text-sm font-medium leading-snug">{item.title}</span><span className="shrink-0 text-[11px] text-muted-foreground">{relativeDate(item.created_at)}</span></span>
                    {item.body && <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{item.body}</span>}
                    <span className="mt-1.5 block text-[11px] text-muted-foreground">{severityLabel[item.severity]} · {preferenceLabel[item.category]}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
