import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDollarSign, FileClock, HeartPulse, ListTodo, ShieldAlert, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@/lib/local-date";
import { COMMERCIAL_PLAN_STATUS, formatBRL } from "@/services/renewal-expansion";
import { IMPACT_LABEL, PROBABILITY_LABEL } from "@/services/risk-opportunities";
import type { ExecutiveReport, ExecutiveReportPortfolioItem, ExecutiveReportPeriod } from "@/services/executive-report";
import { PrintReportButton } from "@/components/dashboard/reports/print-report-button";

const PERIOD_LABELS: Record<ExecutiveReportPeriod, string> = { 7: "7 dias", 30: "30 dias", 90: "90 dias" };

function civilDate(value: string) {
  return parseLocalDate(value).toLocaleDateString("pt-BR");
}

function generatedDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function changeDate(value: string) {
  return value.length === 10 ? civilDate(value) : generatedDate(value);
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">{children}</p>;
}

function PortfolioList({ items, empty }: { items: ExecutiveReportPortfolioItem[]; empty: string }) {
  if (items.length === 0) return <Empty>{empty}</Empty>;
  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <Link href={`/accounts/${item.clientId}`} className="font-medium hover:underline">{item.clientName}</Link>
              <p className="text-sm">{item.title}</p>
            </div>
            <div className="flex gap-1.5">
              <Badge variant="outline">Prioridade {item.priority}</Badge>
              {item.overdue && <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">Vencido</Badge>}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Impacto {IMPACT_LABEL[item.impact].toLowerCase()} · probabilidade {PROBABILITY_LABEL[item.probability].toLowerCase()} · {item.ownerName} · prazo {civilDate(item.targetDate)}</p>
        </li>
      ))}
    </ul>
  );
}

export function ExecutiveReportView({ report }: { report: ExecutiveReport }) {
  const indicators = [
    { label: "Clientes ativos", value: report.summary.activeClients, icon: Users },
    { label: "Health Score", value: report.summary.healthScore, icon: HeartPulse },
    { label: "Qualidade dos dados", value: report.summary.dataQualityScore, icon: CheckCircle2 },
    { label: "Valor contratado", value: formatBRL(report.summary.activeContractValue), icon: CircleDollarSign },
    { label: "Sem próxima ação", value: report.summary.clientsWithoutNextAction, icon: ListTodo },
  ];

  return (
    <article className="space-y-5 print:space-y-3">
      <header className="hidden border-b pb-3 print:block">
        <p className="text-xs font-semibold uppercase tracking-widest">AISphere · Deep Management</p>
        <h1 className="mt-1 text-2xl font-bold">Relatório executivo periódico</h1>
        <p className="text-sm">Período de {civilDate(report.period.start)} a {civilDate(report.period.end)} · gerado em {generatedDate(report.generatedAt)}</p>
      </header>

      <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <p className="text-sm font-medium">Período do relatório</p>
          <p className="text-xs text-muted-foreground">{civilDate(report.period.start)} a {civilDate(report.period.end)} · gerado em {generatedDate(report.generatedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[7, 30, 90].map((days) => (
            <Link key={days} href={`/reports/executive?period=${days}`} aria-current={report.period.days === days ? "page" : undefined} className={cn(buttonVariants({ variant: report.period.days === days ? "default" : "outline", size: "sm" }))}>{PERIOD_LABELS[days as ExecutiveReportPeriod]}</Link>
          ))}
          <PrintReportButton />
        </div>
      </div>

      <section aria-labelledby="report-summary-title">
        <h2 id="report-summary-title" className="mb-3 text-lg font-semibold">Resumo da carteira</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 print:grid-cols-5">
          {indicators.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="print:shadow-none">
              <CardContent className="p-4">
                <Icon className="mb-2 size-4 text-blue-600" aria-hidden="true" />
                <p className="text-2xl font-bold tabular-nums">{value}</p>
                <p className="text-xs font-medium">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="report-changes-title">
        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle><h2 id="report-changes-title" className="flex items-center gap-2 text-base"><FileClock className="size-4" aria-hidden="true" />Principais mudanças</h2></CardTitle>
            <CardDescription>Movimentações registradas nos {report.period.days} dias do relatório. Exibindo {report.changes.timeline.length} de {report.changes.total} mudanças.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-2 sm:grid-cols-4">
              {[['Interações', report.changes.interactions], ['Ações alteradas', report.changes.actionUpdates], ['Riscos e oportunidades', report.changes.portfolioUpdates], ['Planos comerciais', report.changes.commercialUpdates]].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-xl font-semibold tabular-nums">{value}</dd></div>
              ))}
            </dl>
            {report.changes.timeline.length === 0 ? <Empty>Nenhuma mudança registrada no período.</Empty> : (
              <ol className="divide-y">
                {report.changes.timeline.map((item) => (
                  <li key={item.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div><span className="text-sm font-medium">{item.label}</span><span className="text-sm text-muted-foreground"> · {item.detail} · </span><Link href={`/accounts/${item.clientId}`} className="text-sm font-medium hover:underline">{item.clientName}</Link></div>
                    <time className="shrink-0 text-xs text-muted-foreground">{changeDate(item.occurredAt)}</time>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-5 xl:grid-cols-2 print:grid-cols-2">
        <section aria-labelledby="report-risks-title">
          <Card className="h-full print:shadow-none">
            <CardHeader><CardTitle><h2 id="report-risks-title" className="flex items-center gap-2 text-base"><ShieldAlert className="size-4 text-rose-600" aria-hidden="true" />Riscos</h2></CardTitle><CardDescription>Riscos abertos por prioridade.</CardDescription></CardHeader>
            <CardContent><PortfolioList items={report.risks} empty="Nenhum risco aberto na carteira." /></CardContent>
          </Card>
        </section>
        <section aria-labelledby="report-opportunities-title">
          <Card className="h-full print:shadow-none">
            <CardHeader><CardTitle><h2 id="report-opportunities-title" className="flex items-center gap-2 text-base"><Sparkles className="size-4 text-emerald-600" aria-hidden="true" />Oportunidades</h2></CardTitle><CardDescription>Oportunidades abertas por prioridade.</CardDescription></CardHeader>
            <CardContent><PortfolioList items={report.opportunities} empty="Nenhuma oportunidade aberta na carteira." /></CardContent>
          </Card>
        </section>
      </div>

      <section aria-labelledby="report-renewals-title">
        <Card className="print:shadow-none">
          <CardHeader><CardTitle><h2 id="report-renewals-title" className="flex items-center gap-2 text-base"><CalendarClock className="size-4 text-emerald-600" aria-hidden="true" />Renovações</h2></CardTitle><CardDescription>Contratos com renovação nos próximos 180 dias.</CardDescription></CardHeader>
          <CardContent>
            {report.renewals.length === 0 ? <Empty>Nenhuma renovação prevista para os próximos 180 dias.</Empty> : (
              <ul className="divide-y">{report.renewals.map(({ client, plan, daysRemaining }) => (
                <li key={client.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div><Link href={`/accounts/${client.id}`} className="font-medium hover:underline">{client.name}</Link><p className="text-xs text-muted-foreground">{civilDate(client.contract_renewal_date!)} · em {daysRemaining} dias · {formatBRL(Number(client.contract_value ?? 0))}</p></div>
                  <Badge variant="outline">{plan ? `${COMMERCIAL_PLAN_STATUS[plan.status]} · ${plan.probability}%` : "Plano pendente"}</Badge>
                </li>
              ))}</ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="report-overdue-title">
        <Card className="print:shadow-none">
          <CardHeader><CardTitle><h2 id="report-overdue-title" className="flex items-center gap-2 text-base"><AlertTriangle className="size-4 text-amber-600" aria-hidden="true" />Ações atrasadas</h2></CardTitle><CardDescription>Tarefas ativas com prazo vencido.</CardDescription></CardHeader>
          <CardContent>
            {report.overdueActions.length === 0 ? <Empty>Nenhuma ação atrasada na carteira.</Empty> : (
              <ul className="divide-y">{report.overdueActions.map(({ task, ownerName, daysOverdue }) => (
                <li key={task.id} className="py-3 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-2"><div><Link href={`/accounts/${task.client_id}`} className="font-medium hover:underline">{task.client_name}</Link><p className="text-sm">{task.reason}</p></div><Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">{daysOverdue} dia(s) · prioridade {task.priority}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{ownerName} · prazo {civilDate(task.due_date)}</p></li>
              ))}</ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="report-decisions-title">
        <Card className="border-blue-100 bg-blue-50/30 print:shadow-none">
          <CardHeader><CardTitle><h2 id="report-decisions-title" className="text-base">Decisões necessárias da liderança</h2></CardTitle><CardDescription>Sinais objetivos que exigem direcionamento, sem decisão automática.</CardDescription></CardHeader>
          <CardContent>
            {report.decisions.length === 0 ? <Empty>Nenhuma decisão de liderança identificada neste momento.</Empty> : (
              <ol className="space-y-2">{report.decisions.map((item, index) => (
                <li key={item.id} className="rounded-lg border bg-white p-3"><p className="text-sm font-medium">{index + 1}. {item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.rationale} · <Link href={`/accounts/${item.clientId}`} className="font-medium text-foreground hover:underline">{item.clientName}</Link></p></li>
              ))}</ol>
            )}
          </CardContent>
        </Card>
      </section>
    </article>
  );
}
