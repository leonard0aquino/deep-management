"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Flag, Pencil, Plus, Target, Trash2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { parseLocalDate } from "@/lib/local-date";
import { createClient } from "@/lib/supabase/client";
import type {
  ClientSuccessMilestone,
  ClientSuccessPlan,
  DeepManager,
  SuccessMilestoneStatus,
  SuccessPlanStatus,
} from "@/lib/types/database";
import {
  calculateSuccessPlanProgress,
  SUCCESS_MILESTONE_STATUS,
  SUCCESS_PLAN_STATUS,
} from "@/services/success-plans";

const fieldClass = "space-y-1.5 text-sm font-medium";

function formatDate(value: string) {
  return parseLocalDate(value).toLocaleDateString("pt-BR");
}

export function ClientSuccessPlanSection({
  clientId,
  defaultOwnerManagerId,
  plan,
  milestones,
  managers,
  canManage,
}: {
  clientId: string;
  defaultOwnerManagerId: string | null;
  plan: ClientSuccessPlan | null;
  milestones: ClientSuccessMilestone[];
  managers: DeepManager[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [planOpen, setPlanOpen] = useState(false);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ClientSuccessMilestone | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const progress = calculateSuccessPlanProgress(milestones);

  function openMilestone(milestone: ClientSuccessMilestone | null) {
    setEditingMilestone(milestone);
    setConfirmDelete(false);
    setError(null);
    setMilestoneOpen(true);
  }

  function savePlan(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const value = (key: string) => String(formData.get(key) ?? "").trim();
        const payload = {
          objective: value("objective"),
          expected_outcome: value("expected_outcome"),
          owner_manager_id: value("owner_manager_id"),
          target_date: value("target_date"),
          status: value("status") as SuccessPlanStatus,
        };
        const supabase = createClient();
        const { error: dbError } = plan
          ? await supabase.from("client_success_plans").update(payload).eq("id", plan.id)
          : await supabase.from("client_success_plans").insert({ client_id: clientId, ...payload });

        if (dbError) {
          setError("Não foi possível salvar o plano. Tente novamente.");
          return;
        }

        setFeedback(plan ? "Plano de sucesso atualizado." : "Plano de sucesso criado.");
        setPlanOpen(false);
        router.refresh();
      } catch {
        setError("Falha de conexão. Tente novamente.");
      }
    });
  }

  function saveMilestone(formData: FormData) {
    if (!plan) return;
    setError(null);
    startTransition(async () => {
      try {
        const value = (key: string) => String(formData.get(key) ?? "").trim();
        const payload = {
          title: value("title"),
          owner_manager_id: value("owner_manager_id") || null,
          target_date: value("target_date"),
          status: value("status") as SuccessMilestoneStatus,
        };
        const supabase = createClient();
        const { error: dbError } = editingMilestone
          ? await supabase.from("client_success_milestones").update(payload).eq("id", editingMilestone.id)
          : await supabase.from("client_success_milestones").insert({ plan_id: plan.id, ...payload });

        if (dbError) {
          setError("Não foi possível salvar o marco. Tente novamente.");
          return;
        }

        setFeedback(editingMilestone ? "Marco atualizado." : "Marco adicionado.");
        setMilestoneOpen(false);
        router.refresh();
      } catch {
        setError("Falha de conexão. Tente novamente.");
      }
    });
  }

  function deleteMilestone() {
    if (!editingMilestone) return;
    setError(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error: dbError } = await supabase
          .from("client_success_milestones")
          .delete()
          .eq("id", editingMilestone.id);

        if (dbError) {
          setError("Não foi possível remover o marco. Tente novamente.");
          return;
        }

        setFeedback("Marco removido.");
        setMilestoneOpen(false);
        router.refresh();
      } catch {
        setError("Falha de conexão. Tente novamente.");
      }
    });
  }

  const planOwner = managers.find((manager) => manager.id === plan?.owner_manager_id);

  return (
    <Card aria-labelledby="success-plan-title">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle id="success-plan-title" className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" aria-hidden="true" />
              Plano de sucesso
            </CardTitle>
            <CardDescription>Objetivos e marcos acordados para gerar valor ao cliente.</CardDescription>
          </div>
          {canManage && (
            <Dialog open={planOpen} onOpenChange={(open) => { setPlanOpen(open); setError(null); }}>
              <DialogTrigger render={<Button variant={plan ? "outline" : "default"} size="sm" />}>
                {plan ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}
                {plan ? "Editar plano" : "Criar plano"}
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <form action={savePlan} className="space-y-5">
                  <DialogHeader>
                    <DialogTitle>{plan ? "Editar plano de sucesso" : "Criar plano de sucesso"}</DialogTitle>
                    <DialogDescription>Defina o resultado que a AISphere e o cliente querem alcançar.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <label className={fieldClass} htmlFor="success-plan-objective">
                      Objetivo <span aria-hidden="true">*</span>
                      <Textarea id="success-plan-objective" name="objective" required minLength={3} maxLength={500} defaultValue={plan?.objective ?? ""} />
                    </label>
                    <label className={fieldClass} htmlFor="success-plan-outcome">
                      Resultado esperado <span aria-hidden="true">*</span>
                      <Textarea id="success-plan-outcome" name="expected_outcome" required minLength={3} maxLength={1000} defaultValue={plan?.expected_outcome ?? ""} />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className={fieldClass} htmlFor="success-plan-owner">
                        Responsável <span aria-hidden="true">*</span>
                        <select id="success-plan-owner" name="owner_manager_id" required defaultValue={plan?.owner_manager_id ?? defaultOwnerManagerId ?? ""} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <option value="">Selecionar</option>
                          {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
                        </select>
                      </label>
                      <label className={fieldClass} htmlFor="success-plan-target-date">
                        Data-alvo <span aria-hidden="true">*</span>
                        <Input id="success-plan-target-date" name="target_date" type="date" required defaultValue={plan?.target_date ?? ""} />
                      </label>
                      <label className={fieldClass} htmlFor="success-plan-status">
                        Status <span aria-hidden="true">*</span>
                        <select id="success-plan-status" name="status" required defaultValue={plan?.status ?? "rascunho"} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          {Object.entries(SUCCESS_PLAN_STATUS).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>
                  {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setPlanOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar plano"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {feedback && <p role="status" className="text-sm text-emerald-700">{feedback}</p>}
        {!plan ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="rounded-full bg-blue-50 p-3 text-blue-600"><Target className="h-5 w-5" aria-hidden="true" /></div>
            <p className="font-medium">Nenhum plano de sucesso criado</p>
            <p className="max-w-lg text-sm text-muted-foreground">Registre o objetivo compartilhado, o resultado esperado e os marcos que demonstram evolução.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Objetivo</p>
                  <p className="mt-1 text-base leading-relaxed">{plan.objective}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Resultado esperado</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{plan.expected_outcome}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/35 p-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Status</p><Badge variant="outline" className={`mt-1 ${SUCCESS_PLAN_STATUS[plan.status].badge}`}>{SUCCESS_PLAN_STATUS[plan.status].label}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Progresso</p><p className="mt-1 text-lg font-semibold">{progress}%</p></div>
                <div className="flex gap-2"><UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" /><div><p className="text-xs text-muted-foreground">Responsável</p><p>{planOwner?.name ?? "Não encontrado"}</p></div></div>
                <div className="flex gap-2"><CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" /><div><p className="text-xs text-muted-foreground">Data-alvo</p><p>{formatDate(plan.target_date)}</p></div></div>
              </div>
            </div>

            <Progress value={progress} aria-label={`Progresso do plano de sucesso: ${progress}%`}>
              <ProgressLabel>Progresso dos marcos</ProgressLabel>
              <ProgressValue>{() => `${progress}%`}</ProgressValue>
            </Progress>

            <section aria-labelledby="success-milestones-title" className="space-y-3 border-t pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 id="success-milestones-title" className="flex items-center gap-2 font-medium"><Flag className="h-4 w-4 text-blue-600" aria-hidden="true" />Marcos</h3>
                  <p className="text-xs text-muted-foreground">Entregas verificáveis que comprovam o avanço do plano.</p>
                </div>
                {canManage && <Button size="sm" variant="outline" onClick={() => openMilestone(null)}><Plus aria-hidden="true" />Adicionar marco</Button>}
              </div>
              {milestones.length === 0 ? (
                <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Nenhum marco cadastrado. O progresso permanecerá em 0% até que o plano tenha entregas mensuráveis.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {milestones.map((milestone) => {
                    const owner = managers.find((manager) => manager.id === milestone.owner_manager_id);
                    return (
                      <article key={milestone.id} className="rounded-xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div><p className="font-medium">{milestone.title}</p><p className="mt-1 text-xs text-muted-foreground">{owner?.name ?? "Sem responsável específico"} · {formatDate(milestone.target_date)}</p></div>
                          {canManage && <Button variant="ghost" size="icon-sm" aria-label={`Editar marco: ${milestone.title}`} onClick={() => openMilestone(milestone)}><Pencil aria-hidden="true" /></Button>}
                        </div>
                        <Badge variant="outline" className={`mt-3 ${SUCCESS_MILESTONE_STATUS[milestone.status].badge}`}>{SUCCESS_MILESTONE_STATUS[milestone.status].label}</Badge>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </CardContent>

      <Dialog open={milestoneOpen} onOpenChange={(open) => { setMilestoneOpen(open); setError(null); setConfirmDelete(false); }}>
        <DialogContent className="sm:max-w-lg">
          <form action={saveMilestone} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{editingMilestone ? "Editar marco" : "Adicionar marco"}</DialogTitle>
              <DialogDescription>Defina uma entrega verificável do plano de sucesso.</DialogDescription>
            </DialogHeader>
            <label className={fieldClass} htmlFor="success-milestone-title">
              Título <span aria-hidden="true">*</span>
              <Input id="success-milestone-title" name="title" required minLength={3} maxLength={300} defaultValue={editingMilestone?.title ?? ""} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={fieldClass} htmlFor="success-milestone-owner">
                Responsável
                <select id="success-milestone-owner" name="owner_manager_id" defaultValue={editingMilestone?.owner_manager_id ?? plan?.owner_manager_id ?? ""} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Sem responsável específico</option>
                  {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
                </select>
              </label>
              <label className={fieldClass} htmlFor="success-milestone-target-date">
                Data-alvo <span aria-hidden="true">*</span>
                <Input id="success-milestone-target-date" name="target_date" type="date" required defaultValue={editingMilestone?.target_date ?? plan?.target_date ?? ""} />
              </label>
            </div>
            <label className={fieldClass} htmlFor="success-milestone-status">
              Status <span aria-hidden="true">*</span>
              <select id="success-milestone-status" name="status" required defaultValue={editingMilestone?.status ?? "pendente"} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {Object.entries(SUCCESS_MILESTONE_STATUS).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
              </select>
            </label>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {editingMilestone && confirmDelete && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Remover este marco definitivamente? Essa ação não pode ser desfeita.</p>}
            <DialogFooter className="flex-wrap sm:justify-between">
              {editingMilestone && (
                confirmDelete
                  ? <Button type="button" variant="destructive" onClick={deleteMilestone} disabled={pending}><Trash2 aria-hidden="true" />Confirmar remoção</Button>
                  : <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}><Trash2 aria-hidden="true" />Remover</Button>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setMilestoneOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar marco"}</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
