"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { INTERACTION_TYPE_CONFIG } from "@/lib/interaction-type";
import { revalidateDashboardCache } from "@/lib/actions/revalidate-dashboard";
import { createClient } from "@/lib/supabase/client";
import type { CustomerPlaybook, CustomerPlaybookStep, InteractionType } from "@/lib/types/database";

const interactionTypes = Object.keys(INTERACTION_TYPE_CONFIG) as InteractionType[];

export function PlaybooksSettings({ initialPlaybooks, initialSteps, readOnly = false }: {
  initialPlaybooks: CustomerPlaybook[];
  initialSteps: CustomerPlaybookStep[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [playbooks, setPlaybooks] = useState(initialPlaybooks);
  const [steps, setSteps] = useState(initialSteps);
  const [stepPlaybook, setStepPlaybook] = useState<CustomerPlaybook | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  async function refresh() {
    await revalidateDashboardCache();
    router.refresh();
  }

  function createPlaybook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    setFeedback(null);
    startTransition(async () => {
      const { data, error } = await createClient().from("customer_playbooks").insert({
        name,
        description: description || null,
      }).select().single<CustomerPlaybook>();
      if (error || !data) {
        setFeedback({ kind: "error", message: `Não foi possível criar o playbook: ${error?.message ?? "resposta vazia"}` });
        return;
      }
      setPlaybooks((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
      formElement.reset();
      setFeedback({ kind: "success", message: `Playbook “${data.name}” criado.` });
      await revalidateDashboardCache();
      router.refresh();
    });
  }

  function togglePlaybook(playbook: CustomerPlaybook) {
    setFeedback(null);
    startTransition(async () => {
      const { error } = await createClient().from("customer_playbooks")
        .update({ active: !playbook.active }).eq("id", playbook.id);
      if (error) {
        setFeedback({ kind: "error", message: `Não foi possível atualizar o playbook: ${error.message}` });
        return;
      }
      setPlaybooks((current) => current.map((item) => item.id === playbook.id ? { ...item, active: !item.active } : item));
      setFeedback({ kind: "success", message: `Playbook “${playbook.name}” ${playbook.active ? "inativado" : "ativado"}.` });
      await refresh();
    });
  }

  function addStep(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stepPlaybook) return;
    const form = new FormData(event.currentTarget);
    const currentSteps = steps.filter((step) => step.playbook_id === stepPlaybook.id);
    setFeedback(null);
    startTransition(async () => {
      const { data, error } = await createClient().from("customer_playbook_steps").insert({
        playbook_id: stepPlaybook.id,
        position: Math.max(0, ...currentSteps.map((step) => step.position)) + 1,
        title: String(form.get("title") ?? "").trim(),
        guidance: String(form.get("guidance") ?? "").trim() || null,
        day_offset: Number(form.get("day_offset")),
        priority: String(form.get("priority")) as "alta" | "media",
        recommended_interaction_type: String(form.get("interaction_type")) as InteractionType,
      }).select().single<CustomerPlaybookStep>();
      if (error || !data) {
        setFeedback({ kind: "error", message: `Não foi possível adicionar a etapa: ${error?.message ?? "resposta vazia"}` });
        return;
      }
      setSteps((current) => [...current, data]);
      setStepPlaybook(null);
      setFeedback({ kind: "success", message: `Etapa adicionada ao playbook “${stepPlaybook.name}”.` });
      await revalidateDashboardCache();
      router.refresh();
    });
  }

  function removeStep(step: CustomerPlaybookStep) {
    setFeedback(null);
    startTransition(async () => {
      const { error } = await createClient().from("customer_playbook_steps").delete().eq("id", step.id);
      if (error) {
        setFeedback({ kind: "error", message: `Não foi possível excluir a etapa: ${error.message}` });
        return;
      }
      setSteps((current) => current.filter((item) => item.id !== step.id));
      setFeedback({ kind: "success", message: `Etapa “${step.title}” excluída.` });
      await refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-blue-600" aria-hidden="true" />Playbooks de Customer Success</CardTitle>
        <CardDescription>Modelos reutilizáveis que viram cadências de tarefas na carteira.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback && <p role={feedback.kind === "error" ? "alert" : "status"} className={`text-sm ${feedback.kind === "error" ? "text-destructive" : "text-emerald-700"}`}>{feedback.message}</p>}

        {!readOnly && (
          <form onSubmit={createPlaybook} className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-[1fr_1.5fr_auto] md:items-end">
            <label className="space-y-1 text-xs font-medium">Nome<Input name="name" required minLength={3} placeholder="Ex.: Onboarding executivo" /></label>
            <label className="space-y-1 text-xs font-medium">Descrição<Input name="description" placeholder="Objetivo e momento de uso" /></label>
            <Button type="submit" disabled={pending}><Plus aria-hidden="true" />Criar playbook</Button>
          </form>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {playbooks.map((playbook) => {
            const playbookSteps = steps.filter((step) => step.playbook_id === playbook.id).sort((a, b) => a.position - b.position);
            return (
              <section key={playbook.id} className="rounded-xl border p-4" aria-labelledby={`playbook-${playbook.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><h3 id={`playbook-${playbook.id}`} className="font-medium">{playbook.name}</h3><p className="mt-1 text-xs text-muted-foreground">{playbook.description ?? "Sem descrição"}</p></div>
                  {readOnly ? <Badge variant="outline">{playbook.active ? "Ativo" : "Inativo"}</Badge> : <label className="flex items-center gap-2 text-xs"><span>{playbook.active ? "Ativo" : "Inativo"}</span><Switch aria-label={`${playbook.active ? "Inativar" : "Ativar"} ${playbook.name}`} checked={playbook.active} onCheckedChange={() => togglePlaybook(playbook)} disabled={pending} /></label>}
                </div>
                <ol className="mt-4 space-y-2">
                  {playbookSteps.map((step) => (
                    <li key={step.id} className="flex items-start justify-between gap-3 rounded-lg bg-muted/35 p-3 text-sm">
                      <div><p className="font-medium">{step.position}. {step.title}</p><p className="mt-1 text-xs text-muted-foreground">Dia +{step.day_offset} · {INTERACTION_TYPE_CONFIG[step.recommended_interaction_type].label} · Prioridade {step.priority === "alta" ? "alta" : "média"}</p>{step.guidance && <p className="mt-1 text-xs text-muted-foreground">{step.guidance}</p>}</div>
                      {!readOnly && <Button type="button" size="icon" variant="ghost" aria-label={`Excluir etapa ${step.title}`} onClick={() => removeStep(step)} disabled={pending}><Trash2 aria-hidden="true" /></Button>}
                    </li>
                  ))}
                </ol>
                {playbookSteps.length === 0 && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Adicione ao menos uma etapa antes de aplicar este playbook.</p>}
                {!readOnly && <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setStepPlaybook(playbook)}><Plus aria-hidden="true" />Adicionar etapa</Button>}
              </section>
            );
          })}
        </div>
        {playbooks.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum playbook criado. Comece pelo modelo de contato mais repetido pela equipe.</p>}
      </CardContent>

      <Dialog open={Boolean(stepPlaybook)} onOpenChange={(open) => { if (!open) setStepPlaybook(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar etapa</DialogTitle><DialogDescription>{stepPlaybook ? `Nova etapa em “${stepPlaybook.name}”.` : "Defina a próxima ação do playbook."}</DialogDescription></DialogHeader>
          <form onSubmit={addStep} className="space-y-4">
            <label className="block space-y-1 text-xs font-medium">Título<Input name="title" required minLength={3} /></label>
            <label className="block space-y-1 text-xs font-medium">Orientação<Textarea name="guidance" placeholder="Contexto para executar esta etapa" /></label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs font-medium">Dias após início<Input name="day_offset" type="number" min={0} max={730} required defaultValue={0} /></label>
              <label className="space-y-1 text-xs font-medium">Prioridade<select name="priority" defaultValue="media" className="h-9 w-full rounded-lg border bg-background px-3"><option value="media">Média</option><option value="alta">Alta</option></select></label>
              <label className="space-y-1 text-xs font-medium">Interação<select name="interaction_type" defaultValue="meeting" className="h-9 w-full rounded-lg border bg-background px-3">{interactionTypes.map((type) => <option key={type} value={type}>{INTERACTION_TYPE_CONFIG[type].label}</option>)}</select></label>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setStepPlaybook(null)}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Adicionar etapa"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
