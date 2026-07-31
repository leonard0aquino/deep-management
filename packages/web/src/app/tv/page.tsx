import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldAlert, Activity, Layers, TrendingUp } from "lucide-react";
import { getAuthorizedDashboardData } from "@/lib/data";
import { requireAccess } from "@/lib/auth/access-context";
import { detectAtRiskClients } from "@/services/insights";
import { generatePriorityActions } from "@/services/priority-actions";
import { TvHeaderClock } from "@/components/tv/tv-header-clock";
import { TvHeatmap } from "@/components/tv/tv-heatmap";
import { TvSpotlight } from "@/components/tv/tv-spotlight";
import { TvRecentActivity } from "@/components/tv/tv-recent-activity";

export const metadata = { title: "DEEP — Modo TV" };

const PRIORITY_STYLE: Record<"alta" | "media", string> = {
  alta: "border-red-900/60 bg-red-950/40 text-red-300",
  media: "border-amber-900/60 bg-amber-950/40 text-amber-300",
};

function Tile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-8 w-8" />
      </div>
      <div>
        <p className="text-5xl font-bold tabular-nums text-white">{value}</p>
        <p className="mt-1 text-sm text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export default async function TvPage() {
  const [data] = await Promise.all([getAuthorizedDashboardData(), requireAccess("tv")]);
  const atRisk = detectAtRiskClients(data.clientHealth);
  const actions = generatePriorityActions(data.matrix, data.interactions).slice(0, 6);
  const spotlightItems = [...data.matrix].sort((a, b) => a.composite_score - b.composite_score).slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white lg:p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-10 w-40">
            <Image src="/logo-deep-slogan.png" alt="DEEP" fill className="object-contain object-left" priority />
          </div>
          <h1 className="text-2xl font-semibold text-slate-200 lg:text-3xl">Cockpit Executivo — Modo TV</h1>
        </div>
        <div className="flex items-center gap-4">
          <TvHeaderClock />
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Sair
          </Link>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Tile icon={TrendingUp} label="Health Score geral" value={data.healthScore.score} tone="border border-blue-900/60 bg-blue-950/40 text-blue-300" />
        <Tile icon={ShieldAlert} label="Clientes em risco" value={atRisk.length} tone="border border-red-900/60 bg-red-950/40 text-red-300" />
        <Tile icon={Layers} label="Combinações críticas" value={data.healthScore.critical_count} tone="border border-orange-900/60 bg-orange-950/40 text-orange-300" />
        <Tile icon={Activity} label="Combinações monitoradas" value={data.healthScore.tracked_combinations} tone="border border-slate-700 bg-slate-800/60 text-slate-300" />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-slate-200">Mapa de calor — Cliente × Produto</h2>
        <div className="mt-4">
          <TvHeatmap clients={data.clients} products={data.products} matrix={data.matrix} />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-semibold text-slate-200">Prioridades</h2>
          <div className="mt-4 space-y-3">
            {actions.length === 0 && <p className="text-sm text-slate-500">Nenhuma prioridade no momento.</p>}
            {actions.map((action) => (
              <div key={action.key} className={`rounded-xl border p-4 ${PRIORITY_STYLE[action.priority]}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-white">
                    {action.clientName} · {action.productName}
                  </p>
                  <span className="shrink-0 text-xs uppercase tracking-wide opacity-80">{action.priority}</span>
                </div>
                <p className="mt-1 text-sm opacity-90">{action.reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-semibold text-slate-200">Destaque</h2>
          <TvSpotlight items={spotlightItems} />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-semibold text-slate-200">Últimas atividades</h2>
          <div className="mt-4">
            <TvRecentActivity interactions={data.interactions} />
          </div>
        </div>
      </section>
    </div>
  );
}
