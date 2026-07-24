"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { revalidateDashboardCache } from "@/lib/actions/revalidate-dashboard";
import type { HealthScoreSettings } from "@/lib/types/database";

const FIELDS: { key: keyof HealthScoreSettings; label: string }[] = [
  { key: "weight_recency", label: "Recência do contato" },
  { key: "weight_frequency", label: "Frequência de interação" },
  { key: "weight_relevance", label: "Relevância das interações" },
  { key: "weight_participation", label: "Participação do cliente" },
  { key: "weight_diversity", label: "Diversidade de contatos" },
];

const THRESHOLD_FIELDS: { key: keyof HealthScoreSettings; label: string }[] = [
  { key: "threshold_recente_dias", label: "Recente até (dias)" },
  { key: "threshold_ok_dias", label: "Em dia até (dias)" },
  { key: "threshold_atencao_dias", label: "Atenção até (dias)" },
  { key: "threshold_alerta_dias", label: "Alerta até (dias)" },
];

export function HealthScoreWeightsForm({ settings, readOnly = false }: { settings: HealthScoreSettings; readOnly?: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, Math.round(Number(settings[f.key]) * 100)])),
  );
  const [thresholds, setThresholds] = useState<Record<string, number>>(() =>
    Object.fromEntries(THRESHOLD_FIELDS.map((f) => [f.key, Number(settings[f.key])])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [targetScore, setTargetScore] = useState(Number(settings.target_score));

  const sum = FIELDS.reduce((acc, f) => acc + (values[f.key] ?? 0), 0);
  const isValid = sum === 100;
  const thresholdsAscending =
    thresholds.threshold_recente_dias < thresholds.threshold_ok_dias &&
    thresholds.threshold_ok_dias < thresholds.threshold_atencao_dias &&
    thresholds.threshold_atencao_dias < thresholds.threshold_alerta_dias;

  async function handleSave() {
    if (targetScore < 0 || targetScore > 100) {
      setError("A meta precisa estar entre 0 e 100.");
      return;
    }
    if (!isValid) {
      setError(`Os pesos precisam somar 100% (hoje somam ${sum}%).`);
      return;
    }
    if (!thresholdsAscending) {
      setError("Os limites de dias precisam crescer nesta ordem: Recente < OK < Atenção < Alerta.");
      return;
    }
    setError(null);
    setSaving(true);
    setSaved(false);

    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("health_score_settings")
      .update({
        target_score: targetScore,
        weight_recency: values.weight_recency / 100,
        weight_frequency: values.weight_frequency / 100,
        weight_relevance: values.weight_relevance / 100,
        weight_participation: values.weight_participation / 100,
        weight_diversity: values.weight_diversity / 100,
        threshold_recente_dias: thresholds.threshold_recente_dias,
        threshold_ok_dias: thresholds.threshold_ok_dias,
        threshold_atencao_dias: thresholds.threshold_atencao_dias,
        threshold_alerta_dias: thresholds.threshold_alerta_dias,
      })
      .eq("id", true);

    setSaving(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setSaved(true);
    await revalidateDashboardCache();
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pesos do Health Score</CardTitle>
        <CardDescription>
          Como cada fator contribui para o score composto (0-100). Precisam somar 100%.
          {readOnly && " Somente leitura — apenas administradores podem alterar."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border bg-muted/25 p-3">
          <div>
            <label htmlFor="target-score" className="text-sm font-medium">Meta executiva</label>
            <p className="text-xs text-muted-foreground">Referência esperada para o Health Score geral.</p>
          </div>
          <Input id="target-score" type="number" min={0} max={100} value={targetScore} onChange={(event) => setTargetScore(Number(event.target.value))} className="w-20 text-right" disabled={readOnly} />
        </div>
        {FIELDS.map((field) => (
          <div key={field.key} className="flex items-center justify-between gap-3">
            <label className="text-sm">{field.label}</label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                max={100}
                value={values[field.key]}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.key]: Number(e.target.value) }))
                }
                className="w-20 text-right"
                disabled={readOnly}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        ))}
        <div className={`text-right text-sm font-medium ${isValid ? "text-emerald-600" : "text-red-600"}`}>
          Total: {sum}%
        </div>

        <div className="border-t pt-3">
          <p className="text-sm font-medium">Status de relacionamento</p>
          <p className="mb-3 text-xs text-muted-foreground">
            A partir de quantos dias sem contato um cliente/produto muda de status. Acima do limite de
            Alerta, o status vira Crítico.
          </p>
          {THRESHOLD_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center justify-between gap-3 py-1">
              <label className="text-sm">{field.label}</label>
              <Input
                type="number"
                min={1}
                value={thresholds[field.key]}
                onChange={(e) =>
                  setThresholds((prev) => ({ ...prev, [field.key]: Number(e.target.value) }))
                }
                className="w-20 text-right"
                disabled={readOnly}
              />
            </div>
          ))}
          {!thresholdsAscending && (
            <p className="text-right text-sm font-medium text-red-600">
              Precisam crescer: Recente &lt; OK &lt; Atenção &lt; Alerta.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Pesos atualizados com sucesso.</p>}
      </CardContent>
      {!readOnly && (
        <CardFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar pesos"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
