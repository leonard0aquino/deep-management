"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  History,
  MessageSquarePlus,
  RotateCcw,
  UserRoundCheck,
} from "lucide-react";
import { ActionTaskDialog, type ActionTaskDialogIntent } from "@/components/dashboard/executive/action-task-dialog";
import { InteractionFormDialog } from "@/components/dashboard/registros/interaction-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardData } from "@/lib/data";
import type {
  ActionDecision,
  ActionTask,
  ActionTaskEvent,
  ActionTaskEventType,
  ActionTaskStatus,
  AssignableActionUser,
} from "@/lib/types/database";
import {
  isActionTaskOverdue,
  reconcileActionTasks,
  type ActionTaskItem,
} from "@/services/action-tasks";
import type { PriorityAction } from "@/services/priority-actions";

type ActionTab = "open" | "completed" | "dismissed";

const STATUS_LABELS: Record<ActionTaskStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluída",
  postponed: "Adiada",
  dismissed: "Dispensada",
};

const EVENT_LABELS: Record<ActionTaskEventType, string> = {
  created: "Tarefa criada",
  assigned: "Responsável alterado",
  started: "Execução iniciada",
  completed: "Tarefa concluída",
  postponed: "Tarefa adiada",
  dismissed: "Tarefa dispensada",
  reopened: "Tarefa reaberta",
  due_date_changed: "Prazo alterado",
  updated: "Tarefa atualizada",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(`${value.slice(0, 10)}T12:00:00`),
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function PriorityActionCenter({
  actions,
  decisions,
  tasks,
  events,
  users,
  userId,
  data,
}: {
  actions: PriorityAction[];
  decisions: ActionDecision[];
  tasks: ActionTask[];
  events: ActionTaskEvent[];
  users: AssignableActionUser[];
  userId: string;
  data: DashboardData;
}) {
  const [tab, setTab] = useState<ActionTab>("open");
  const [taskIntent, setTaskIntent] = useState<ActionTaskDialogIntent | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionTaskItem | null>(null);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const items = useMemo(
    () => reconcileActionTasks({ actions, tasks, decisions, clients: data.clients, products: data.products }),
    [actions, tasks, decisions, data.clients, data.products],
  );
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user.name])), [users]);
  const eventsByTask = useMemo(() => {
    const grouped = new Map<string, ActionTaskEvent[]>();
    for (const event of events) {
      const current = grouped.get(event.task_id) ?? [];
      current.push(event);
      grouped.set(event.task_id, current);
    }
    return grouped;
  }, [events]);

  const counts = {
    open: items.filter((item) => item.status === "pending" || item.status === "in_progress" || item.status === "postponed").length,
    completed: items.filter((item) => item.status === "completed").length,
    dismissed: items.filter((item) => item.status === "dismissed").length,
  };
  const visibleItems = items.filter((item) => {
    if (tab === "completed") return item.status === "completed";
    if (tab === "dismissed") return item.status === "dismissed";
    return item.status === "pending" || item.status === "in_progress" || item.status === "postponed";
  });

  function manage(item: ActionTaskItem, overrides: Omit<ActionTaskDialogIntent, "item"> = {}) {
    setTaskIntent({ item, ...overrides });
  }

  function openInteraction(item: ActionTaskItem) {
    setSelectedAction(item);
    setInteractionOpen(true);
  }

  return (
    <section id="priority-actions" className="scroll-mt-4 rounded-xl border bg-white shadow-none" aria-labelledby="priority-actions-title">
      <div className="flex flex-col gap-3 border-b px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
            <h2 id="priority-actions-title" className="text-[13px] font-medium">Central de Ações Prioritárias</h2>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Recomendações transformadas em tarefas com responsável, prazo e resultado</p>
        </div>
        <div className="flex w-fit rounded-lg bg-muted p-1" role="tablist" aria-label="Estado das tarefas">
          {(["open", "completed", "dismissed"] as const).map((itemTab) => (
            <button
              key={itemTab}
              type="button"
              role="tab"
              aria-selected={tab === itemTab}
              onClick={() => setTab(itemTab)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${tab === itemTab ? "bg-white shadow-sm" : "text-muted-foreground"}`}
            >
              {itemTab === "open" ? "Abertas" : itemTab === "completed" ? "Concluídas" : "Dispensadas"} · {counts[itemTab]}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y px-5">
        {visibleItems.slice(0, 20).map((item) => {
          const overdue = isActionTaskOverdue(item.status, item.dueDate);
          const taskEvents = item.task ? eventsByTask.get(item.task.id) ?? [] : [];
          const assigneeName = item.assignedTo ? usersById.get(item.assignedTo) ?? "Usuário removido" : "Não atribuído";

          return (
            <article key={item.key} className="grid gap-3 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={item.priority === "alta" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                    {item.priority === "alta" ? "Alta" : "Média"}
                  </Badge>
                  <Badge variant="outline" className={item.status === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : item.status === "dismissed" ? "text-muted-foreground" : "border-blue-200 bg-blue-50 text-blue-700"}>
                    {STATUS_LABELS[item.status]}
                  </Badge>
                  {overdue && <Badge className="bg-red-600 text-white"><AlertTriangle aria-hidden="true" /> Atrasada</Badge>}
                  <p className="truncate text-[12px] font-medium">{item.clientName} · {item.productName}</p>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{item.reason}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><UserRoundCheck className="h-3 w-3" aria-hidden="true" /> {assigneeName}</span>
                  <span className={`inline-flex items-center gap-1 ${overdue ? "font-medium text-red-700" : ""}`}><CalendarClock className="h-3 w-3" aria-hidden="true" /> Até {formatDate(item.dueDate)}</span>
                  {item.updatedAt && <span>Atualizada {formatDateTime(item.updatedAt)}</span>}
                </div>

                {(taskEvents.length > 0 || item.legacyDismissed) && (
                  <details className="group mt-3 text-[10px] text-muted-foreground">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-medium text-foreground">
                      <History className="h-3 w-3" aria-hidden="true" /> Histórico · {taskEvents.length || 1}
                      <ChevronDown className="h-3 w-3 transition group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <ol className="mt-2 space-y-2 border-l pl-3">
                      {item.legacyDismissed && <li>Dispensa anterior preservada para este usuário.</li>}
                      {taskEvents.map((event) => (
                        <li key={event.id}>
                          <span className="font-medium text-foreground">{EVENT_LABELS[event.event_type]}</span>
                          {` por ${event.actor_id ? usersById.get(event.actor_id) ?? "Usuário removido" : "Sistema"} em ${formatDateTime(event.created_at)}`}
                          {event.justification && <span className="block">Justificativa: {event.justification}</span>}
                          {event.result && <span className="block">Resultado: {event.result}</span>}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </div>

              <div className="flex max-w-xl flex-wrap items-center gap-2 xl:justify-end">
                <Button variant="outline" size="sm" render={<Link href={`/accounts/${item.clientId}`} />}>
                  Abrir cliente <ArrowUpRight aria-hidden="true" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => openInteraction(item)}>
                  <MessageSquarePlus aria-hidden="true" /> Registrar interação
                </Button>

                {item.status === "pending" && !item.assignedTo && (
                  <Button size="sm" onClick={() => manage(item, { assignedTo: userId })}>Assumir</Button>
                )}
                {item.status === "pending" && item.assignedTo && (
                  <Button size="sm" onClick={() => manage(item, { status: "in_progress" })}>Iniciar</Button>
                )}
                {item.status === "in_progress" && (
                  <Button size="sm" onClick={() => manage(item, { status: "completed" })}>Concluir</Button>
                )}
                {item.status === "postponed" && (
                  <Button size="sm" onClick={() => manage(item, { status: "pending" })}><RotateCcw aria-hidden="true" /> Reabrir</Button>
                )}
                {(item.status === "completed" || item.status === "dismissed") && (
                  <Button size="sm" onClick={() => manage(item, { status: "pending" })}><RotateCcw aria-hidden="true" /> Reabrir</Button>
                )}
                {(item.status === "pending" || item.status === "in_progress") && (
                  <Button variant="ghost" size="sm" onClick={() => manage(item, { status: "postponed" })}>Adiar</Button>
                )}
                {item.status !== "completed" && item.status !== "dismissed" && (
                  <Button variant="ghost" size="sm" onClick={() => manage(item, { status: "dismissed" })}>Dispensar</Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => manage(item)}>Gerenciar</Button>
              </div>
            </article>
          );
        })}

        {visibleItems.length === 0 && (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" aria-hidden="true" />
            <p className="mt-2 text-[12px] font-medium">Nenhuma tarefa nesta etapa</p>
            <p className="mt-1 text-[11px] text-muted-foreground">A Central será atualizada conforme a equipe tratar as recomendações.</p>
          </div>
        )}
      </div>

      <ActionTaskDialog
        open={Boolean(taskIntent)}
        onOpenChange={(open) => { if (!open) setTaskIntent(null); }}
        intent={taskIntent}
        users={users}
      />

      <InteractionFormDialog
        open={interactionOpen}
        onOpenChange={setInteractionOpen}
        clients={data.clients}
        products={data.products}
        managers={data.managers}
        contacts={data.contacts}
        clientProducts={data.clientProducts}
        editing={null}
        initialClientId={selectedAction?.clientId}
        initialProductId={selectedAction?.productId}
      />
    </section>
  );
}
