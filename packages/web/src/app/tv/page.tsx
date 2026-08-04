import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldAlert, Activity, Layers, TrendingUp, RefreshCw } from "lucide-react";
import { getAuthorizedDashboardData } from "@/lib/data";
import { requireAccess } from "@/lib/auth/access-context";
import { canAccessForArea } from "@/lib/auth/access-control";
import { detectAtRiskClients } from "@/services/insights";
import { generatePriorityActions } from "@/services/priority-actions";
import { TvHeaderClock } from "@/components/tv/tv-header-clock";
import { TvDashboardContent } from "@/components/tv/tv-dashboard-content";
import { normalizeTvTheme, TvThemeSwitch } from "@/components/tv/tv-theme-switch";

export const metadata = { title: "DEEP — Modo TV" };

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
    <div className="flex items-center gap-5 rounded-2xl border border-[var(--tv-border)] bg-[var(--tv-panel-solid)] p-6">
      <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-8 w-8" />
      </div>
      <div>
        <p className="text-5xl font-bold tabular-nums text-[var(--tv-text)]">{value}</p>
        <p className="mt-1 text-sm text-[var(--tv-muted)]">{label}</p>
      </div>
    </div>
  );
}

export default async function TvPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string | string[] }>;
}) {
  const theme = normalizeTvTheme((await searchParams).theme);
  const [data, context] = await Promise.all([getAuthorizedDashboardData(), requireAccess("tv")]);
  const atRisk = detectAtRiskClients(data.clientHealth);
  const actions = generatePriorityActions(data.matrix, data.interactions).slice(0, 6);
  const spotlightItems = [...data.matrix].sort((a, b) => a.composite_score - b.composite_score).slice(0, 8);

  return (
    <div className={`tv-theme tv-theme-${theme} min-h-screen bg-[var(--tv-bg)] p-8 text-[var(--tv-text)] lg:p-10`}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-10 w-40">
            <Image src="/logo-deep-slogan.png" alt="DEEP" fill className="object-contain object-left" priority />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--tv-heading)] lg:text-3xl">Cockpit Executivo — Modo TV</h1>
        </div>
        <div className="flex items-center gap-4">
          <TvThemeSwitch theme={theme} />
          {canAccessForArea(context.role, context.businessArea, "commercial") && <Link href="/commercial/tv" className="flex items-center gap-1.5 rounded-lg border border-[var(--tv-border)] px-3 py-1.5 text-xs text-[var(--tv-subtle)] hover:text-[var(--tv-heading)]"><RefreshCw className="h-3.5 w-3.5" /> TV Comercial</Link>}
          <TvHeaderClock />
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--tv-border)] px-3 py-1.5 text-xs text-[var(--tv-subtle)] hover:text-[var(--tv-heading)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Sair
          </Link>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Tile icon={TrendingUp} label="Health Score geral" value={data.healthScore.score} tone="tv-tone-blue" />
        <Tile icon={ShieldAlert} label="Clientes em risco" value={atRisk.length} tone="tv-tone-red" />
        <Tile icon={Layers} label="Combinações críticas" value={data.healthScore.critical_count} tone="tv-tone-orange" />
        <Tile icon={Activity} label="Combinações monitoradas" value={data.healthScore.tracked_combinations} tone="tv-tone-neutral" />
      </section>

      <TvDashboardContent
        clients={data.clients}
        products={data.products}
        matrix={data.matrix}
        interactions={data.interactions}
        actions={actions}
        spotlightItems={spotlightItems}
      />
    </div>
  );
}
