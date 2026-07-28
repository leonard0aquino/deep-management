"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CircleDollarSign, Pencil, Plus, TrendingUp, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseLocalDate } from "@/lib/local-date";
import { createClient } from "@/lib/supabase/client";
import type { Client, ClientCommercialPlan, ClientCommercialPlanStatus, DeepManager } from "@/lib/types/database";
import { COMMERCIAL_PLAN_STATUS, formatBRL, weightedCommercialValues } from "@/services/renewal-expansion";

const fieldClass = "space-y-1.5 text-sm font-medium";

export function ClientCommercialPlanSection({ client, plan, managers, canManage }: {
  client: Client;
  plan: ClientCommercialPlan | null;
  managers: DeepManager[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const weighted = plan ? weightedCommercialValues(plan) : null;
  const isRenewed = plan?.status === "renovado";
  const isLost = plan?.status === "perdido";
  const displayed = plan && weighted ? (
    isRenewed
      ? { renewal: Number(plan.expected_renewal_value), expansion: Number(plan.expansion_value), total: Number(plan.expected_renewal_value) + Number(plan.expansion_value) }
      : isLost ? { renewal: 0, expansion: 0, total: 0 } : weighted
  ) : null;
  const owner = managers.find((manager) => manager.id === plan?.owner_manager_id);

  function save(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const value = (key: string) => String(formData.get(key) ?? "").trim();
        const payload = {
          owner_manager_id: value("owner_manager_id"),
          status: value("status") as ClientCommercialPlanStatus,
          probability: Number(value("probability")),
          expected_renewal_value: Number(value("expected_renewal_value")),
          expansion_value: Number(value("expansion_value")),
          next_step: value("next_step"),
          next_step_due_date: value("next_step_due_date"),
          notes: value("notes") || null,
        };
        const supabase = createClient();
        const { error: dbError } = plan
          ? await supabase.from("client_commercial_plans").update(payload).eq("id", plan.id)
          : await supabase.from("client_commercial_plans").insert({ client_id: client.id, ...payload });
        if (dbError) {
          setError("Não foi possível salvar o plano comercial. Tente novamente.");
          return;
        }
        setFeedback(plan ? "Plano comercial atualizado." : "Plano comercial criado.");
        setOpen(false);
        router.refresh();
      } catch {
        setError("Falha de conexão. Tente novamente.");
      }
    });
  }

  return (
    <Card aria-labelledby="commercial-plan-title">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle id="commercial-plan-title" className="flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Renovação e expansão
            </CardTitle>
            <CardDescription>Estratégia financeira para antecipar a próxima negociação.</CardDescription>
          </div>
          {canManage && (
            <Dialog open={open} onOpenChange={(value) => { setOpen(value); setError(null); }}>
              <DialogTrigger render={<Button size="sm" variant={plan ? "outline" : "default"} />}>
                {plan ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}
                {plan ? "Editar plano comercial" : "Criar plano comercial"}
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <form action={save} className="space-y-5">
                  <DialogHeader>
                    <DialogTitle>{plan ? "Editar plano comercial" : "Criar plano comercial"}</DialogTitle>
                    <DialogDescription>Os valores e a probabilidade compõem a previsão ponderada da carteira.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={fieldClass}>Responsável interno
                      <select name="owner_manager_id" required defaultValue={plan?.owner_manager_id ?? client.owner_manager_id ?? ""} className="h-9 w-full rounded-md border bg-background px-3">
                        <option value="" disabled>Selecione</option>
                        {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
                      </select>
                    </label>
                    <label className={fieldClass}>Status
                      <select name="status" required defaultValue={plan?.status ?? "nao_iniciado"} className="h-9 w-full rounded-md border bg-background px-3">
                        {Object.entries(COMMERCIAL_PLAN_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className={fieldClass}>Probabilidade (%)
                      <Input name="probability" type="number" min="0" max="100" step="1" required defaultValue={plan?.probability ?? 50} />
                    </label>
                    <label className={fieldClass}>Renovação esperada (R$)
                      <Input name="expected_renewal_value" type="number" min="0" step="0.01" required defaultValue={plan?.expected_renewal_value ?? client.contract_value ?? 0} />
                    </label>
                    <label className={fieldClass}>Expansão potencial (R$)
                      <Input name="expansion_value" type="number" min="0" step="0.01" required defaultValue={plan?.expansion_value ?? 0} />
                    </label>
                    <label className={fieldClass}>Prazo do próximo passo
                      <Input name="next_step_due_date" type="date" required defaultValue={plan?.next_step_due_date ?? ""} />
                    </label>
                  </div>
                  <label className={fieldClass}>Próximo passo
                    <Input name="next_step" minLength={3} maxLength={500} required defaultValue={plan?.next_step ?? ""} />
                  </label>
                  <label className={fieldClass}>Observações <span className="font-normal text-muted-foreground">(opcional)</span>
                    <Textarea name="notes" minLength={3} maxLength={2000} defaultValue={plan?.notes ?? ""} />
                  </label>
                  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                  <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar plano comercial"}</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {feedback && <p role="status" className="text-sm text-emerald-700">{feedback}</p>}
        {!plan ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum plano comercial definido. Registre a estratégia antes da próxima renovação.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{COMMERCIAL_PLAN_STATUS[plan.status]}</Badge>
              <span className="text-sm font-medium">{plan.probability}% de probabilidade</span>
              {owner && <span className="flex items-center gap-1 text-sm text-muted-foreground"><UserRound className="h-3.5 w-3.5" aria-hidden="true" />{owner.name}</span>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Contrato atual" value={formatBRL(Number(client.contract_value ?? 0))} />
              <Metric label={isRenewed ? "Renovação realizada" : isLost ? "Renovação no pipeline" : "Renovação ponderada"} value={formatBRL(displayed!.renewal)} />
              <Metric label={isRenewed ? "Expansão realizada" : isLost ? "Expansão no pipeline" : "Expansão ponderada"} value={formatBRL(displayed!.expansion)} />
              <Metric label={isRenewed ? "Receita realizada" : isLost ? "Pipeline encerrado" : "Previsão ponderada total"} value={formatBRL(displayed!.total)} emphasis={isRenewed || !isLost} />
            </div>
            <p className="text-xs text-muted-foreground">
              {isRenewed
                ? "Valores registrados como realizados e removidos do pipeline aberto."
                : isLost
                  ? "Plano perdido: valores removidos do pipeline aberto."
                  : `Cálculo: (${formatBRL(Number(plan.expected_renewal_value))} + ${formatBRL(Number(plan.expansion_value))}) × ${plan.probability}%.`}
            </p>
            <div className="grid gap-3 rounded-lg bg-muted/40 p-4 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Próximo passo</p><p className="text-sm font-medium">{plan.next_step}</p></div>
              <div><p className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />Prazo</p><p className="text-sm font-medium">{parseLocalDate(plan.next_step_due_date).toLocaleDateString("pt-BR")}</p></div>
            </div>
            {plan.notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{plan.notes}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 font-semibold tabular-nums ${emphasis ? "text-emerald-700" : ""}`}>{value}</p>{emphasis && <TrendingUp className="mt-1 h-4 w-4 text-emerald-600" aria-hidden="true" />}</div>;
}
