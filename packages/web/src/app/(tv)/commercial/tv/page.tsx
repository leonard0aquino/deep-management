import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { CommercialTvContent } from "@/components/tv/commercial-tv-content";
import { TvHeaderClock } from "@/components/tv/tv-header-clock";
import { normalizeTvTheme, TvThemeSwitch } from "@/components/tv/tv-theme-switch";
import { requireAccess } from "@/lib/auth/access-context";
import { canAccessForArea } from "@/lib/auth/access-control";
import { getCommercialData } from "@/lib/commercial-data";
import { buildCommercialDashboard } from "@/services/commercial-dashboard";

export const metadata = { title: "DEEP — TV Comercial" };

export default async function CommercialTvPage({ searchParams }: { searchParams: Promise<{ theme?: string | string[] }> }) {
  const theme = normalizeTvTheme((await searchParams).theme);
  const context = await requireAccess("commercial");
  const data = await getCommercialData(context);
  const referenceAt = new Date().toISOString();
  const summary = buildCommercialDashboard({ opportunities: data.opportunities, events: data.events, interactions: data.interactions, filters: { periodDays: null }, referenceAt });
  const canSwitchToCustomerSuccess = canAccessForArea(context.role, context.businessArea, "tv");

  return <div className={`tv-theme tv-theme-${theme} min-h-screen bg-[var(--tv-bg)] p-7 text-[var(--tv-text)] lg:p-9`}>
    <header className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="relative h-10 w-40"><Image src="/logo-deep-slogan.png" alt="DEEP" fill className="object-contain object-left" priority /></div><div><h1 className="text-2xl font-semibold text-[var(--tv-heading)] lg:text-3xl">Painel Comercial</h1><p className="text-xs uppercase tracking-[0.2em] text-[var(--tv-subtle)]">Funil e agenda AISphere</p></div></div><div className="flex items-center gap-3"><TvThemeSwitch theme={theme} basePath="/commercial/tv" />{canSwitchToCustomerSuccess && <Link href="/tv" className="flex items-center gap-1.5 rounded-lg border border-[var(--tv-border)] px-3 py-2 text-xs text-[var(--tv-muted)]"><RefreshCw className="h-3.5 w-3.5" /> TV Customer Success</Link>}<TvHeaderClock /><Link href="/commercial" className="flex items-center gap-1.5 rounded-lg border border-[var(--tv-border)] px-3 py-2 text-xs text-[var(--tv-subtle)] hover:text-[var(--tv-heading)]"><ArrowLeft className="h-3.5 w-3.5" /> Sair</Link></div></header>
    <CommercialTvContent summary={summary} clients={data.clients} managers={data.managers} referenceAt={referenceAt} />
  </div>;
}
