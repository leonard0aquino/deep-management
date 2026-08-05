import type { JiraIssue } from "@/lib/types/database";
import { buildJiraProjectDashboard } from "@/services/jira-import";

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export function JiraTvContent({ issues, lastImportedAt, referenceDate }: { issues: JiraIssue[]; lastImportedAt: string | null; referenceDate: string }) {
  const dashboard = buildJiraProjectDashboard(issues, referenceDate);
  const statusCounts = [...issues.reduce((map, issue) => map.set(issue.status, (map.get(issue.status) ?? 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]);
  const openIssues = dashboard.issues.filter((issue) => !issue.status_category.toLocaleLowerCase("pt-BR").includes("conclu"));
  const exceptions = [...openIssues].sort((a, b) => {
    const overdueA = a.due_at && a.due_at < referenceDate ? 0 : 1;
    const overdueB = b.due_at && b.due_at < referenceDate ? 0 : 1;
    return overdueA - overdueB || String(a.due_at ?? "9999").localeCompare(String(b.due_at ?? "9999"));
  }).slice(0, 8);
  const maxAssignee = Math.max(1, ...dashboard.assignees.map((item) => item.total));

  return <>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--tv-subtle)]"><span>Painel operacional · volume não equivale a produtividade</span><span>{lastImportedAt ? `Jira importado em ${dateTime.format(new Date(lastImportedAt))}` : "Aguardando primeira importação"}</span></div>
    <section className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
      {([['Total', dashboard.kpis.total, 'text-indigo-500'], ['Concluídos', dashboard.kpis.completed, 'text-emerald-500'], ['Em aberto', dashboard.kpis.open, 'text-amber-500'], ['Vencidos', dashboard.kpis.overdue, 'text-rose-500'], ['Sem responsável', dashboard.kpis.unassigned, 'text-cyan-500']] as const).map(([label, value, tone]) => <div key={label} className="rounded-2xl border border-[var(--tv-border)] bg-[var(--tv-panel-solid)] p-5"><p className={`text-6xl font-black tabular-nums ${tone}`}>{value}</p><p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--tv-muted)]">{label}</p></div>)}
    </section>

    <section className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr_1.4fr]">
      <div className="rounded-2xl border border-[var(--tv-border)] bg-[var(--tv-panel)] p-5"><h2 className="text-sm uppercase tracking-[0.2em] text-[var(--tv-muted)]">Fluxo por status</h2><div className="mt-5 space-y-4">{statusCounts.map(([status, count]) => <div key={status}><div className="flex justify-between gap-3 text-sm"><span className="truncate font-medium">{status}</span><span className="font-bold tabular-nums">{count}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--tv-border)]"><div className="h-full rounded-full bg-violet-500" style={{ width: `${issues.length ? count / issues.length * 100 : 0}%` }} /></div></div>)}</div></div>

      <div className="rounded-2xl border border-[var(--tv-border)] bg-[var(--tv-panel)] p-5"><h2 className="text-sm uppercase tracking-[0.2em] text-[var(--tv-muted)]">Distribuição do time</h2><p className="mt-1 text-xs text-[var(--tv-subtle)]">Cards atuais por responsável</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{dashboard.assignees.slice(0, 12).map((item) => <div key={item.id}><div className="flex justify-between gap-2 text-sm"><span className="truncate font-medium">{item.name}</span><span className="tabular-nums text-[var(--tv-muted)]">{item.total}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--tv-border)]"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${item.total / maxAssignee * 100}%` }} /></div><p className="mt-1 text-[10px] text-[var(--tv-subtle)]">{item.open} abertos · {item.completed} concluídos</p></div>)}</div></div>

      <div className="rounded-2xl border border-[var(--tv-border)] bg-[var(--tv-panel)] p-5"><div className="flex items-center justify-between"><h2 className="text-sm uppercase tracking-[0.2em] text-[var(--tv-muted)]">Atenção operacional</h2>{dashboard.kpis.overdue > 0 && <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-500">{dashboard.kpis.overdue} vencido(s)</span>}</div><div className="mt-4 space-y-3">{exceptions.map((issue) => { const overdue = issue.due_at && issue.due_at < referenceDate; return <div key={issue.id} className={`rounded-xl border border-l-4 bg-[var(--tv-panel-solid)] p-3 ${overdue ? "border-l-rose-500" : "border-l-amber-500"}`}><div className="flex items-start justify-between gap-3"><p className="truncate font-semibold">{issue.issue_key} · {issue.summary}</p><span className="shrink-0 text-xs text-[var(--tv-muted)]">{issue.status}</span></div><p className="mt-2 text-xs text-[var(--tv-subtle)]">{issue.assignee_name ?? "Sem responsável"}{issue.due_at ? ` · prazo ${issue.due_at.split("-").reverse().join("/")}` : " · sem prazo"}</p></div>; })}{!exceptions.length && <p className="py-24 text-center text-sm text-[var(--tv-subtle)]">Nenhum card aberto.</p>}</div></div>
    </section>
  </>;
}
