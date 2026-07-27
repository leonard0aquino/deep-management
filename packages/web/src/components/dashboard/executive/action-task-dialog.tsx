"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { ActionTaskStatus, AssignableActionUser } from "@/lib/types/database";
import {
  allowedActionTaskTransitions,
  type ActionTaskItem,
  validateActionTaskChange,
} from "@/services/action-tasks";

const STATUS_LABELS: Record<ActionTaskStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluída",
  postponed: "Adiada",
  dismissed: "Dispensada",
};

const UNASSIGNED = "unassigned";

export type ActionTaskDialogIntent = {
  item: ActionTaskItem;
  status?: ActionTaskStatus;
  assignedTo?: string | null;
};

export function ActionTaskDialog({
  open,
  onOpenChange,
  intent,
  users,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: ActionTaskDialogIntent | null;
  users: AssignableActionUser[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {open && intent && (
          <ActionTaskForm
            key={`${intent.item.key}:${intent.status ?? intent.item.status}:${intent.assignedTo ?? "default"}`}
            intent={intent}
            users={users}
            onSaved={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActionTaskForm({
  intent,
  users,
  onSaved,
}: {
  intent: ActionTaskDialogIntent;
  users: AssignableActionUser[];
  onSaved: () => void;
}) {
  const router = useRouter();
  const { item } = intent;
  const [status, setStatus] = useState<ActionTaskStatus>(intent.status ?? item.status);
  const [assignedTo, setAssignedTo] = useState(
    intent.assignedTo === undefined ? (item.assignedTo ?? UNASSIGNED) : (intent.assignedTo ?? UNASSIGNED),
  );
  const [dueDate, setDueDate] = useState(item.dueDate);
  const [justification, setJustification] = useState(item.task?.justification ?? "");
  const [result, setResult] = useState(item.task?.result ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const transitions = allowedActionTaskTransitions(item.status);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateActionTaskChange({
      status,
      assignedTo: assignedTo === UNASSIGNED ? null : assignedTo,
      dueDate,
      justification,
      result,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const mutableFields = {
        status,
        assigned_to: assignedTo === UNASSIGNED ? null : assignedTo,
        due_date: dueDate,
        justification:
          status === "postponed" || status === "dismissed" ? justification.trim() : null,
        result: status === "completed" ? result.trim() : null,
      };

      const query = item.task
        ? supabase
            .from("action_tasks")
            .update(mutableFields)
            .eq("id", item.task.id)
            .select()
            .single()
        : supabase
            .from("action_tasks")
            .upsert(
              {
                action_key: item.key,
                client_id: item.clientId,
                product_id: item.productId,
                priority: item.priority,
                reason: item.reason,
                ...mutableFields,
              },
              { onConflict: "action_key" },
            )
            .select()
            .single();

      const { error: dbError } = await query;
      if (dbError) {
        setError("Não foi possível atualizar a tarefa. Tente novamente.");
        return;
      }

      onSaved();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>Gerenciar tarefa</DialogTitle>
        <DialogDescription>
          {item.clientName} · {item.productName}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <label htmlFor="action-task-status" className="text-sm font-medium">Estado</label>
        <select
          id="action-task-status"
          aria-label="Estado da tarefa"
          value={status}
          onChange={(event) => setStatus(event.target.value as ActionTaskStatus)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {transitions.map((transition) => (
            <option key={transition} value={transition}>{STATUS_LABELS[transition]}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="action-task-assignee" className="text-sm font-medium">Responsável <span aria-hidden="true">*</span></label>
          <select
            id="action-task-assignee"
            aria-label="Responsável pela tarefa"
            value={assignedTo}
            onChange={(event) => setAssignedTo(event.target.value)}
            aria-required={status !== "dismissed"}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value={UNASSIGNED}>Não atribuído</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="action-task-due-date" className="text-sm font-medium">Prazo</label>
          <Input
            id="action-task-due-date"
            aria-label="Prazo da tarefa"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
      </div>

      {(status === "postponed" || status === "dismissed") && (
        <div className="space-y-1.5">
          <label htmlFor="action-task-justification" className="text-sm font-medium">
            Justificativa {status === "postponed" ? "do adiamento" : "da dispensa"}
          </label>
          <Textarea
            id="action-task-justification"
            aria-label="Justificativa da tarefa"
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
          />
        </div>
      )}

      {status === "completed" && (
        <div className="space-y-1.5">
          <label htmlFor="action-task-result" className="text-sm font-medium">Resultado alcançado</label>
          <Textarea
            id="action-task-result"
            aria-label="Resultado da tarefa"
            value={result}
            onChange={(event) => setResult(event.target.value)}
          />
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onSaved}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar tarefa"}</Button>
      </DialogFooter>
    </form>
  );
}
