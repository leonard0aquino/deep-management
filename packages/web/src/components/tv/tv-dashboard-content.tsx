import { TvHeatmap } from "@/components/tv/tv-heatmap";
import { TvRecentActivity } from "@/components/tv/tv-recent-activity";
import { TvSpotlight } from "@/components/tv/tv-spotlight";
import type { Client, ClientProductMatrixRow, InteractionView, Product } from "@/lib/types/database";
import type { PriorityAction } from "@/services/priority-actions";

const PRIORITY_STYLE: Record<PriorityAction["priority"], string> = {
  alta: "tv-priority-high",
  media: "tv-priority-medium",
};

export function TvDashboardContent({
  clients,
  products,
  matrix,
  interactions,
  actions,
  spotlightItems,
}: {
  clients: Client[];
  products: Product[];
  matrix: ClientProductMatrixRow[];
  interactions: InteractionView[];
  actions: PriorityAction[];
  spotlightItems: ClientProductMatrixRow[];
}) {
  return (
    <>
      <section className="mt-6 rounded-2xl border border-[var(--tv-border)] bg-[var(--tv-panel)] p-6">
        <h2 className="text-lg font-semibold text-[var(--tv-heading)]">Mapa de calor — Cliente × Produto</h2>
        <div className="mt-4">
          <TvHeatmap clients={clients} products={products} matrix={matrix} />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--tv-border)] bg-[var(--tv-panel)] p-6">
          <h2 className="text-lg font-semibold text-[var(--tv-heading)]">Prioridades</h2>
          <div className="mt-4 space-y-3">
            {actions.length === 0 && (
              <p className="text-sm text-[var(--tv-subtle)]">Nenhuma prioridade no momento.</p>
            )}
            {actions.map((action) => (
              <div key={action.key} className={`rounded-xl border p-4 ${PRIORITY_STYLE[action.priority]}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-[var(--tv-text)]">
                    {action.clientName} · {action.productName}
                  </p>
                  <span className="shrink-0 text-xs uppercase tracking-wide opacity-80">{action.priority}</span>
                </div>
                <p className="mt-1 text-sm opacity-90">{action.reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--tv-border)] bg-[var(--tv-panel)] p-6">
          <h2 className="text-lg font-semibold text-[var(--tv-heading)]">Destaque</h2>
          <TvSpotlight items={spotlightItems} />
        </div>

        <div className="rounded-2xl border border-[var(--tv-border)] bg-[var(--tv-panel)] p-6">
          <h2 className="text-lg font-semibold text-[var(--tv-heading)]">Últimas atividades</h2>
          <div className="mt-4">
            <TvRecentActivity interactions={interactions} />
          </div>
        </div>
      </section>
    </>
  );
}
