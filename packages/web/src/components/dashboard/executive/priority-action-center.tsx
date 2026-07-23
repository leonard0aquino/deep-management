"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowUpRight, CalendarClock, CheckCircle2, MessageSquarePlus, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InteractionFormDialog } from "@/components/dashboard/registros/interaction-form-dialog";
import { createClient } from "@/lib/supabase/client";
import type { DashboardData } from "@/lib/data";
import type { ActionDecision } from "@/lib/types/database";
import type { PriorityAction } from "@/services/priority-actions";

export function PriorityActionCenter({
  actions,
  decisions,
  userId,
  data,
}: {
  actions: PriorityAction[];
  decisions: ActionDecision[];
  userId: string;
  data: DashboardData;
}) {
  const [tab, setTab] = useState<"pending" | "dismissed">("pending");
  const [dismissedKeys, setDismissedKeys] = useState(() => new Set(decisions.map((decision) => decision.action_key)));
  const [selectedAction, setSelectedAction] = useState<PriorityAction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleActions = useMemo(
    () => actions.filter((action) => tab === "dismissed" ? dismissedKeys.has(action.key) : !dismissedKeys.has(action.key)),
    [actions, dismissedKeys, tab],
  );
  const pendingCount = actions.filter((action) => !dismissedKeys.has(action.key)).length;
  const dismissedCount = actions.length - pendingCount;

  function dismiss(action: PriorityAction) {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error: dbError } = await supabase.from("action_decisions").upsert(
        { user_id: userId, action_key: action.key, status: "dismissed" },
        { onConflict: "user_id,action_key" },
      );
      if (dbError) {
        setError("Não foi possível dispensar a ação. Verifique se a migração foi aplicada.");
        return;
      }
      setDismissedKeys((current) => new Set(current).add(action.key));
    });
  }

  function restore(action: PriorityAction) {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error: dbError } = await supabase
        .from("action_decisions")
        .delete()
        .eq("user_id", userId)
        .eq("action_key", action.key);
      if (dbError) {
        setError("Não foi possível restaurar a ação.");
        return;
      }
      setDismissedKeys((current) => {
        const next = new Set(current);
        next.delete(action.key);
        return next;
      });
    });
  }

  function openInteraction(action: PriorityAction) {
    setSelectedAction(action);
    setDialogOpen(true);
  }

  return (
    <section className="rounded-xl border bg-white shadow-none" aria-labelledby="priority-actions-title">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
            <h2 id="priority-actions-title" className="text-[13px] font-medium">Central de Ações Prioritárias</h2>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Recomendações determinísticas baseadas em criticidade e tempo sem contato</p>
        </div>
        <div className="flex rounded-lg bg-muted p-1" role="tablist" aria-label="Estado das ações">
          <button type="button" role="tab" aria-selected={tab === "pending"} onClick={() => setTab("pending")} className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${tab === "pending" ? "bg-white shadow-sm" : "text-muted-foreground"}`}>
            Pendentes · {pendingCount}
          </button>
          <button type="button" role="tab" aria-selected={tab === "dismissed"} onClick={() => setTab("dismissed")} className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${tab === "dismissed" ? "bg-white shadow-sm" : "text-muted-foreground"}`}>
            Dispensadas · {dismissedCount}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Fechar erro"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <div className="divide-y px-5">
        {visibleActions.slice(0, 10).map((action) => (
          <article key={action.key} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={action.priority === "alta" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                  {action.priority === "alta" ? "Alta" : "Média"}
                </Badge>
                <p className="truncate text-[12px] font-medium">{action.clientName} · {action.productName}</p>
                <span className="text-[10px] text-muted-foreground">Score {action.score}</span>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{action.reason}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                <span>Responsável: {action.managerName ?? "Não atribuído"}</span>
                <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" aria-hidden="true" /> Até {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(action.dueAt))}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" render={<Link href={`/accounts/${action.clientId}`} />}>
                Abrir cliente <ArrowUpRight aria-hidden="true" />
              </Button>
              {tab === "pending" ? (
                <>
                  <Button size="sm" onClick={() => openInteraction(action)}><MessageSquarePlus aria-hidden="true" /> Registrar interação</Button>
                  <Button variant="ghost" size="sm" disabled={isPending} onClick={() => dismiss(action)}>Dispensar</Button>
                </>
              ) : (
                <Button variant="outline" size="sm" disabled={isPending} onClick={() => restore(action)}><RotateCcw aria-hidden="true" /> Restaurar</Button>
              )}
            </div>
          </article>
        ))}
        {visibleActions.length === 0 && (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" aria-hidden="true" />
            <p className="mt-2 text-[12px] font-medium">{tab === "pending" ? "Nenhuma ação pendente" : "Nenhuma ação dispensada"}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{tab === "pending" ? "A carteira está em dia para este recorte." : "As ações dispensadas aparecerão aqui."}</p>
          </div>
        )}
      </div>

      <InteractionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clients={data.clients}
        products={data.products}
        managers={data.managers}
        contacts={data.contacts}
        editing={null}
        initialClientId={selectedAction?.clientId}
        initialProductId={selectedAction?.productId}
      />
    </section>
  );
}
