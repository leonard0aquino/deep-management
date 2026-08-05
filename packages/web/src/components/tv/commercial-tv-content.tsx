import { CalendarClock } from "lucide-react";
import type { CommercialCockpitStage } from "@/lib/types/database";
import { COMMERCIAL_COCKPIT_KIND_LABEL, type buildCommercialDashboard, type CommercialDashboardUser } from "@/services/commercial-dashboard";

type Summary = ReturnType<typeof buildCommercialDashboard>;
const dateTime = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const dateOnly = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
const updated = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const FUNNEL_TONE: Record<CommercialCockpitStage, string> = { prospecting: "bg-indigo-500", meetings: "bg-violet-500", nda_poc: "bg-pink-500", won: "bg-emerald-500" };
const KPI_TONE: Record<string, string> = { meeting: "text-emerald-500", nda_poc: "text-amber-500", proposal: "text-rose-500", won: "text-rose-500" };

export function CommercialTvContent({ summary, users, referenceAt }: {
  summary: Summary;
  users: CommercialDashboardUser[];
  referenceAt: string;
}) {
  return <>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--tv-subtle)]"><span>Painel Gerencial</span><span>{summary.updatedAt ? `Atualizado por ${summary.updatedBy ?? "usuário Comercial"} em ${updated.format(new Date(summary.updatedAt))}` : "Ainda sem atualização registrada"}</span></div>
    <section className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">{summary.kpis.map((kpi) => <div key={kpi.key} className={`rounded-2xl border bg-[var(--tv-panel-solid)] p-5 ${(kpi.key === "proposal" || kpi.key === "won") && (kpi.days ?? 0) > 14 ? "border-red-400" : "border-[var(--tv-border)]"}`}><p className={`text-6xl font-black tabular-nums ${KPI_TONE[kpi.key]}`}>{kpi.days ?? "—"}</p><p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--tv-muted)]">{kpi.label}</p><p className="mt-2 text-xs text-[var(--tv-subtle)]">{kpi.date ? dateOnly.format(new Date(`${kpi.date}T12:00:00Z`)) : "Ainda sem registro"}</p></div>)}</section>

    <section className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.7fr]">
      <div className="rounded-2xl border border-[var(--tv-border)] bg-[var(--tv-panel)] p-5">
        <h2 className="text-xl font-semibold text-[var(--tv-text)]">Funil de vendas</h2>
        <div data-testid="commercial-tv-funnel" className="mt-4 space-y-2">
          {summary.funnel.map((item, index) => <div key={item.key}>
            <div className={`relative mx-auto rounded-xl px-4 py-3 text-white ${FUNNEL_TONE[item.key]}`} style={{ width: `${100 - index * 9}%` }}><p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-85">{item.label}</p><p className="mt-1 text-3xl font-bold tabular-nums">{item.count}</p></div>
            {index > 0 && <p className="py-1 text-center text-xs font-semibold text-[var(--tv-muted)]">{item.conversion === null ? "—" : `${item.conversion}%`} de conversão</p>}
          </div>)}
          {summary.funnel.length === 0 && <p className="py-16 text-center text-sm text-[var(--tv-subtle)]">Nenhuma etapa Comercial atribuída.</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--tv-border)] bg-[var(--tv-panel)] p-5"><div className="flex items-center justify-between"><h2 className="text-sm uppercase tracking-[0.2em] text-[var(--tv-muted)]">Agenda Comercial</h2>{summary.overdue.length > 0 && <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-500">{summary.overdue.length} atrasado(s)</span>}</div><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">{summary.agenda.slice(0, 6).map((entry) => {
        const owner = users.find((user) => user.id === entry.owner_user_id);
        const overdueEntry = entry.scheduled_at < referenceAt;
        return <div key={entry.id} className={`rounded-xl border border-t-4 bg-[var(--tv-panel-solid)] p-4 ${overdueEntry ? "border-t-rose-500" : "border-t-cyan-500"}`}><p className="truncate text-base font-bold text-[var(--tv-text)]">{entry.company_name}</p><p className="truncate text-xs text-[var(--tv-muted)]">{entry.title}</p><p className="mt-5 flex items-center gap-1.5 text-lg font-semibold text-[var(--tv-heading)]"><CalendarClock className="h-4 w-4" />{dateTime.format(new Date(entry.scheduled_at))}</p><div className="mt-4 flex items-center justify-between text-xs text-[var(--tv-subtle)]"><span>{owner?.name ?? "Comercial"}</span><span>{COMMERCIAL_COCKPIT_KIND_LABEL[entry.kind]}</span></div></div>;
      })}</div>{summary.agenda.length === 0 && <p className="py-24 text-center text-sm text-[var(--tv-subtle)]">Nenhum compromisso Comercial agendado.</p>}</div>
    </section>
  </>;
}
