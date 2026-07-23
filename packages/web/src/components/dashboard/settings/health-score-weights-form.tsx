"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { HealthScoreSettings } from "@/lib/types/database";

const FIELDS: { key: keyof HealthScoreSettings; label: string }[] = [
  { key: "weight_recency", label: "Recência do contato" },
  { key: "weight_frequency", label: "Frequência de interação" },
  { key: "weight_relevance", label: "Relevância das interações" },
  { key: "weight_participation", label: "Participação do cliente" },
  { key: "weight_diversity", label: "Diversidade de contatos" },
];

export function HealthScoreWeightsForm({ settings, readOnly = false }: { settings: HealthScoreSettings; readOnly?: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, Math.round(Number(settings[f.key]) * 100)])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [targetScore, setTargetScore] = useState(Number(settings.target_score));

  const sum = FIELDS.reduce((acc, f) => acc + (values[f.key] ?? 0), 0);
  const isValid = sum === 100;

  async function handleSave() {
    if (targetScore < 0 || targetScore > 100) {
      setError("A meta precisa estar entre 0 e 100.");
      return;
    }
    if (!isValid) {
      setError(`Os pesos precisam somar 100% (hoje somam ${sum}%).`);
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
      })
      .eq("id", true);

    setSaving(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setSaved(true);
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
