"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUpRight, BookOpenCheck, CalendarDays, CheckCircle2, UserRoundCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { INTERACTION_TYPE_CONFIG } from "@/lib/interaction-type";
import { parseLocalDate } from "@/lib/local-date";
import { revalidateDashboardCache } from "@/lib/actions/revalidate-dashboard";
import { createClient } from "@/lib/supabase/client";
import type { ClientCadenceProgress, CustomerPlaybook, CustomerPlaybookStep, DeepManager, Product } from "@/lib/types/database";

function formatDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString("pt-BR");
}

export function ClientCadences({ clientId, cadences, playbooks, playbookSteps, products, managers, canManage }: {
  clientId: string;
  cadences: ClientCadenceProgress[];
  playbooks: CustomerPlaybook[];
  playbookSteps: CustomerPlaybookStep[];
  products: Product[];
  managers: DeepManager[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const applicablePlaybooks = playbooks.filter((playbook) => playbook.active && playbookSteps.some((step) => step.playbook_id === playbook.id));
  const assignableManagers = managers.filter((manager) => manager.active && manager.linked_user_id);

  function applyPlaybook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFeedback(null);
    startTransition(async () => {
      const { error } = await createClient().rpc("apply_customer_playbook", {
        p_playbook_id: String(form.get("playbook_id")),
        p_client_id: clientId,
        p_product_id: String(form.get("product_id")),
        p_owner_manager_id: String(form.get("owner_manager_id")),
        p_start_date: String(form.get("start_date")),
      });
      if (error) {
        setFeedback({ kind: "error", message: `Não foi possível iniciar a cadência: ${error.message}` });
        return;
      }
      setFeedback({ kind: "success", message: "Cadência iniciada e tarefas adicionadas à rotina da equipe." });
      setOpen(false);
      await revalidateDashboardCache();
      router.refresh();
    });
  }

  return (
    <Card aria-labelledby="client-cadences-title">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><CardTitle id="client-cadences-title" className="flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-blue-600" aria-hidden="true" />Cadências e playbooks</CardTitle><CardDescription>Sequências de contato transformadas em tarefas com prazo e responsável.</CardDescription></div>
          {canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button size="sm" />} nativeButton={false}>Iniciar cadência</DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Aplicar playbook</DialogTitle><DialogDescription>As etapas serão criadas como tarefas e aparecerão em Meu dia.</DialogDescription></DialogHeader>
                <form onSubmit={applyPlaybook} className="space-y-4">
                  <label className="block space-y-1 text-xs font-medium">Playbook<select name="playbook_id" required defaultValue="" className="h-9 w-full rounded-lg border bg-background px-3"><option value="" disabled>Selecione</option>{applicablePlaybooks.map((playbook) => <option key={playbook.id} value={playbook.id}>{playbook.name}</option>)}</select></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-medium">Produto<select name="product_id" required defaultValue="" className="h-9 w-full rounded-lg border bg-background px-3"><option value="" disabled>Selecione</option>{products.filter((product) => product.active).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                    <label className="space-y-1 text-xs font-medium">Responsável AISphere<select name="owner_manager_id" required defaultValue="" className="h-9 w-full rounded-lg border bg-background px-3"><option value="" disabled>Selecione</option>{assignableManagers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select></label>
                  </div>
                  <label className="block space-y-1 text-xs font-medium">Data inicial<Input name="start_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
                  {applicablePlaybooks.length === 0 && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Crie um playbook ativo com ao menos uma etapa em Configurações.</p>}
                  {assignableManagers.length === 0 && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Vincule um usuário ativo ao gestor responsável antes de iniciar.</p>}
                  {feedback?.kind === "error" && <p role="alert" className="text-sm text-destructive">{feedback.message}</p>}
                  <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={pending || applicablePlaybooks.length === 0 || assignableManagers.length === 0}>{pending ? "Criando tarefas..." : "Iniciar cadência"}</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback && <p role={feedback.kind === "error" ? "alert" : "status"} className={`text-sm ${feedback.kind === "error" ? "text-destructive" : "text-emerald-700"}`}>{feedback.message}</p>}
        {cadences.map((cadence) => (
          <article key={cadence.id} className="rounded-xl border p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{cadence.playbook_name}</h3><Badge variant="outline" className={cadence.status === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700"}>{cadence.status === "completed" ? "Concluída" : "Ativa"}</Badge>{cadence.next_step_overdue && <Badge className="bg-red-600 text-white"><AlertTriangle aria-hidden="true" />Próxima etapa atrasada</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{cadence.product_name} · início em {formatDate(cadence.start_date)}</p></div>
              <Button variant="outline" size="sm" render={<Link href="/my-day" />} nativeButton={false}>Abrir Meu dia <ArrowUpRight aria-hidden="true" /></Button>
            </div>
            <div className="mt-4"><Progress value={cadence.progress_percent} aria-label={`Progresso da cadência ${cadence.playbook_name}: ${cadence.progress_percent}%`}><ProgressLabel>{cadence.completed_steps} de {cadence.total_steps} etapas tratadas</ProgressLabel><ProgressValue>{() => `${cadence.progress_percent}%`}</ProgressValue></Progress></div>
            <div className="mt-4 grid gap-3 rounded-lg bg-muted/30 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><p className="text-xs text-muted-foreground">Responsável</p><p className="mt-1 flex items-center gap-1 font-medium"><UserRoundCheck className="h-3.5 w-3.5" aria-hidden="true" />{cadence.owner_manager_name}</p></div>
              <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Próxima etapa</p><p className="mt-1 font-medium">{cadence.next_step ?? (cadence.status === "completed" ? "Cadência concluída" : "Sem tarefa aberta")}</p></div>
              <div><p className="text-xs text-muted-foreground">Prazo e canal</p>{cadence.next_due_date ? <p className={`mt-1 font-medium ${cadence.next_step_overdue ? "text-red-700" : ""}`}><CalendarDays className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />{formatDate(cadence.next_due_date)} · {cadence.next_interaction_type ? INTERACTION_TYPE_CONFIG[cadence.next_interaction_type].label : "Não definido"}</p> : <p className="mt-1 font-medium">—</p>}</div>
            </div>
            {cadence.status === "completed" && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Todas as etapas foram concluídas ou dispensadas.</p>}
          </article>
        ))}
        {cadences.length === 0 && <div className="py-8 text-center"><BookOpenCheck className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" /><p className="mt-2 font-medium">Nenhuma cadência iniciada</p><p className="mt-1 text-sm text-muted-foreground">Aplique um playbook para transformar o processo em tarefas acompanháveis.</p></div>}
      </CardContent>
    </Card>
  );
}
