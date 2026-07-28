"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Gauge, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { revalidateDashboardCache } from "@/lib/actions/revalidate-dashboard";
import type { InternalGoalKey } from "@/lib/types/database";
import { validateInternalGoalTarget, type InternalGoalResult } from "@/services/internal-goals";

const STATUS = {
  achieved: { label: "Atingida", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  attention: { label: "Em atenção", className: "border-amber-200 bg-amber-50 text-amber-800", icon: TriangleAlert },
  no_data: { label: "Sem dados", className: "border-slate-200 bg-slate-50 text-slate-600", icon: Gauge },
} as const;

function formatValue(value: number | null, unit: InternalGoalResult["unit"]) {
  if (value === null) return "Sem dados suficientes";
  return unit === "percent" ? `${value.toFixed(1)}%` : `${value.toFixed(1)} h`;
}

export function InternalGoalsDashboard({
  initialResults,
  currentRiskClients,
  canEdit,
  generatedAt,
}: {
  initialResults: InternalGoalResult[];
  currentRiskClients: number;
  canEdit: boolean;
  generatedAt: string;
}) {
  const router = useRouter();
  const [targets, setTargets] = useState<Record<InternalGoalKey, number>>(() =>
    Object.fromEntries(initialResults.map((item) => [item.key, item.target])) as Record<InternalGoalKey, number>,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function persist(updates: Array<{ key: InternalGoalKey; target_value?: number; baseline_value?: number }>) {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const results = await Promise.all(updates.map(({ key, ...values }) =>
      supabase.from("internal_goals").update(values).eq("key", key),
    ));
    const error = results.find((result) => result.error)?.error;
    setSaving(false);
    if (error) {
      setMessage({ tone: "error", text: error.message });
      return;
    }
    setMessage({ tone: "success", text: "Metas atualizadas com sucesso." });
    await revalidateDashboardCache();
    router.refresh();
  }

  async function saveTargets() {
    const invalid = initialResults.find((item) => !validateInternalGoalTarget(item.key, targets[item.key]));
    if (invalid) {
      setMessage({ tone: "error", text: invalid.unit === "hours" ? "O tempo de resposta deve ficar entre 1 e 720 horas." : "Os percentuais devem ficar entre 0 e 100." });
      return;
    }
    await persist(initialResults.map((item) => ({ key: item.key, target_value: targets[item.key] })));
  }

  return (
    <section aria-labelledby="goals-title" className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 id="goals-title" className="text-lg font-semibold">Acompanhamento das metas</h2>
          <p className="text-sm text-muted-foreground">Atualizado em {generatedAt}. Percentuais e tempos são calculados automaticamente.</p>
        </div>
        {canEdit && <Button type="button" onClick={saveTargets} disabled={saving}>{saving ? "Salvando..." : "Salvar metas"}</Button>}
      </div>

      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`rounded-lg border p-3 text-sm ${message.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message.text}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {initialResults.map((item) => {
          const state = STATUS[item.status];
          const StateIcon = state.icon;
          return (
            <Card key={item.key} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-medium">{item.label}</h3>
                    <CardDescription className="mt-1">{item.description}</CardDescription>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${state.className}`}><StateIcon className="h-3.5 w-3.5" aria-hidden="true" />{state.label}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/35 p-3">
                  <div><p className="text-xs text-muted-foreground">Realizado</p><p className="text-xl font-bold tabular-nums">{formatValue(item.actual, item.unit)}</p></div>
                  <div>
                    <label htmlFor={`goal-${item.key}`} className="text-xs text-muted-foreground">Alvo ({item.direction === "at_least" ? "no mínimo" : "no máximo"})</label>
                    {canEdit ? (
                      <div className="flex items-center gap-1.5"><Input id={`goal-${item.key}`} aria-label={`Alvo de ${item.label}`} type="number" min={item.unit === "hours" ? 1 : 0} max={item.unit === "hours" ? 720 : 100} step="0.1" value={targets[item.key]} onChange={(event) => setTargets((current) => ({ ...current, [item.key]: Number(event.target.value) }))} className="h-8 w-24 text-right" /><span className="text-sm text-muted-foreground">{item.unit === "percent" ? "%" : "h"}</span></div>
                    ) : <p className="text-xl font-bold tabular-nums">{formatValue(item.target, item.unit)}</p>}
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs"><span className="text-muted-foreground">Progresso</span><span className="font-medium tabular-nums">{item.progress === null ? "—" : `${item.progress.toFixed(1)}%`}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className={`h-full rounded-full ${item.status === "achieved" ? "bg-emerald-500" : item.status === "attention" ? "bg-amber-500" : "bg-slate-300"}`} style={{ width: `${item.progress ?? 0}%` }} /></div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{item.window}</div>
                {item.key === "risk_client_reduction" && (
                  <div className="rounded-lg border border-dashed p-3 text-xs">
                    <p>Linha de base: <strong>{item.baseline === null ? "não definida" : `${item.baseline} cliente(s)`}</strong> · Atual: <strong>{currentRiskClients}</strong></p>
                    {canEdit && <Button type="button" variant="outline" size="sm" className="mt-2" disabled={saving || currentRiskClients === 0} title={currentRiskClients === 0 ? "Não há clientes em risco para formar uma linha de base." : undefined} onClick={() => persist([{ key: item.key, baseline_value: currentRiskClients }])}>Usar contagem atual como base</Button>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!canEdit && <p className="text-xs text-muted-foreground">Somente administradores e gerentes podem alterar os alvos e a linha de base.</p>}
    </section>
  );
}
