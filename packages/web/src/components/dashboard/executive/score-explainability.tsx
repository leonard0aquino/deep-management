import { Activity, Calculator, TrendingDown, TrendingUp } from "lucide-react";
import { averageScoreComponents } from "@/services/analytics";
import type { ClientProductMatrixRow, HealthScoreSettings, InteractionView } from "@/lib/types/database";

const WEIGHT_KEY: Record<string, keyof HealthScoreSettings> = {
  "Recência": "weight_recency",
  "Frequência": "weight_frequency",
  "Relevância": "weight_relevance",
  "Participação": "weight_participation",
  "Diversidade": "weight_diversity",
};

function interpretation(value: number) {
  if (value >= 70) return { label: "Positivo", tone: "text-emerald-700 bg-emerald-50", bar: "bg-emerald-500" };
  if (value >= 50) return { label: "Neutro", tone: "text-amber-700 bg-amber-50", bar: "bg-amber-500" };
  return { label: "Atenção", tone: "text-red-700 bg-red-50", bar: "bg-red-500" };
}

export function ScoreExplainability({
  matrix,
  interactions,
  settings,
}: {
  matrix: ClientProductMatrixRow[];
  interactions: InteractionView[];
  settings: HealthScoreSettings;
}) {
  const components = averageScoreComponents(matrix).map((component) => {
    const weight = Number(settings[WEIGHT_KEY[component.component]]) || 0;
    return {
      ...component,
      weight,
      contribution: Math.round(component.value * weight),
      interpretation: interpretation(component.value),
    };
  });
  const recentEvents = interactions.slice(0, 5);

  return (
    <section className="rounded-xl border bg-white shadow-none" aria-labelledby="score-explainability-title">
      <div className="border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-violet-600" aria-hidden="true" />
          <h2 id="score-explainability-title" className="text-[13px] font-medium">Como o Health Score é formado</h2>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Cálculo determinístico sobre cinco componentes. Eventos recentes contextualizam a variação, mas não representam causalidade estatística.</p>
      </div>

      <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4 border-b p-5 lg:border-r lg:border-b-0">
          {components.map((component) => (
            <div key={component.component}>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{component.component}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${component.interpretation.tone}`}>{component.interpretation.label}</span>
                </div>
                <div className="flex gap-3 text-muted-foreground tabular-nums">
                  <span>Valor {component.value}</span>
                  <span>Peso {Math.round(component.weight * 100)}%</span>
                  <span className="font-medium text-foreground">+{component.contribution} pts</span>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-label={`${component.component}: ${component.value} de 100`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={component.value}>
                <div className={`h-full rounded-full ${component.interpretation.bar}`} style={{ width: `${component.value}%` }} />
              </div>
            </div>
          ))}
          {matrix.length === 0 && <p className="py-6 text-center text-[11px] text-muted-foreground">Não há relacionamentos no recorte para decompor o score.</p>}
        </div>

        <div className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" aria-hidden="true" />
            <h3 className="text-[12px] font-medium">Eventos recentes do recorte</h3>
          </div>
          <div className="space-y-2">
            {recentEvents.map((event) => (
              <div key={event.id} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[11px] font-medium">{event.client_name} · {event.product_name}</p>
                  {event.relevance >= 4 ? <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="Alta relevância" /> : <TrendingDown className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-label="Relevância moderada ou baixa" />}
                </div>
                <p className="mt-1 truncate text-[10px] text-muted-foreground">{event.topic} · relevância {event.relevance}/5 · {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(event.occurred_at))}</p>
              </div>
            ))}
            {recentEvents.length === 0 && <p className="py-8 text-center text-[11px] text-muted-foreground">Nenhuma interação recente neste recorte.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
