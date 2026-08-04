import { CalendarClock } from "lucide-react";
import type { Client, DeepManager } from "@/lib/types/database";
import type { buildCommercialDashboard } from "@/services/commercial-dashboard";
import { COMMERCIAL_STAGE_LABEL } from "@/services/commercial-opportunities";

type Summary = ReturnType<typeof buildCommercialDashboard>;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export function CommercialTvContent({ summary, clients, managers, referenceAt }: {
  summary: Summary;
  clients: Client[];
  managers: DeepManager[];
  referenceAt: string;
}) {
  return <>
    <section className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">{summary.kpis.map((kpi, index) => <div key={kpi.key} className={`rounded-2xl border bg-[var(--tv-panel-solid)] p-5 ${index > 1 && (kpi.days ?? 0) > 14 ? "border-red-400" : "border-[var(--tv-border)]"}`}><p className={`text-6xl font-black tabular-nums ${index === 0 ? "text-emerald-500" : index === 1 ? "text-amber-500" : "text-rose-500"}`}>{kpi.days ?? "—"}</p><p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--tv-muted)]">{kpi.label}</p><p className="mt-2 text-xs text-[var(--tv-subtle)]">{kpi.date ? dateTime.format(new Date(kpi.date)) : "Ainda sem registro"}</p></div>)}</section>

    <section className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.7fr]">
      <div className="rounded-2xl border border-[var(--tv-border)] bg-[var(--tv-panel)] p-5">
        <h2 className="text-xl font-semibold text-[var(--tv-text)]">Funil de vendas</h2>
        <div data-testid="commercial-tv-funnel" className="mt-4 space-y-2">
          {summary.funnel.map((item, index) => <div key={item.stage} className="relative overflow-hidden rounded-xl border border-[var(--tv-border)] p-3">
            <div className="absolute inset-y-0 left-0 bg-violet-500/10" style={{ width: `${Math.max(4, 100 - index * 9)}%` }} />
            <div className="relative flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--tv-text)]">{item.label}</p>
                <p className="text-xs text-[var(--tv-muted)]">{money.format(item.weightedAmount)} ponderado</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-[var(--tv-text)]">{item.count}</p>
                <p className="text-xs text-[var(--tv-muted)]">{money.format(item.amount)}</p>
              </div>
            </div>
          </div>)}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--tv-border)] bg-[var(--tv-panel)] p-5"><div className="flex items-center justify-between"><h2 className="text-sm uppercase tracking-[0.2em] text-[var(--tv-muted)]">Agenda Comercial</h2>{summary.overdue.length > 0 && <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-500">{summary.overdue.length} atrasado(s)</span>}</div><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">{summary.agenda.slice(0, 6).map((opportunity) => {
        const client = clients.find((item) => item.id === opportunity.client_id);
        const manager = managers.find((item) => item.id === opportunity.owner_manager_id);
        const overdue = opportunity.next_step_at! < referenceAt;
        return <div key={opportunity.id} className={`rounded-xl border border-t-4 bg-[var(--tv-panel-solid)] p-4 ${overdue ? "border-t-rose-500" : "border-t-cyan-500"}`}><p className="truncate text-base font-bold text-[var(--tv-text)]">{client?.name ?? opportunity.name}</p><p className="truncate text-xs text-[var(--tv-muted)]">{opportunity.name}</p><p className="mt-5 flex items-center gap-1.5 text-lg font-semibold text-[var(--tv-heading)]"><CalendarClock className="h-4 w-4" />{dateTime.format(new Date(opportunity.next_step_at!))}</p><p className="mt-2 line-clamp-2 text-sm text-[var(--tv-muted)]">{opportunity.next_step ?? "Próximo passo não descrito"}</p><div className="mt-4 flex items-center justify-between text-xs text-[var(--tv-subtle)]"><span>{manager?.name ?? "Sem responsável"}</span><span>{COMMERCIAL_STAGE_LABEL[opportunity.stage]}</span></div></div>;
      })}</div>{summary.agenda.length === 0 && <p className="py-24 text-center text-sm text-[var(--tv-subtle)]">Nenhum compromisso Comercial agendado.</p>}</div>
    </section>
  </>;
}
