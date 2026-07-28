import Link from "next/link";
import {
  BellRing,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ListTodo,
  TriangleAlert,
  UserRoundX,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/services/renewal-expansion";
import type { ManagementDashboardSummary, NamedCount } from "@/services/management-dashboard";

const ROLE_LABELS = {
  patrocinador: "Patrocinador",
  decisor: "Decisor",
  influenciador: "Influenciador",
  usuario_chave: "Usuário-chave",
  contato_operacional: "Contato operacional",
  detrator: "Detrator",
} as const;

function CountList({ items, empty }: { items: NamedCount[]; empty: string }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  if (items.length === 0) return <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.name}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium">{item.name}</span>
            <span className="tabular-nums text-muted-foreground">{item.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ManagementDashboard({ summary }: { summary: ManagementDashboardSummary }) {
  const indicators = [
    { label: "Ações abertas", value: summary.actions.open, hint: "pendentes, em andamento ou adiadas", icon: ListTodo, tone: "text-blue-600 bg-blue-50" },
    { label: "Ações concluídas", value: summary.actions.completed, hint: "estado atual concluído", icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Ações atrasadas", value: summary.actions.overdue, hint: "abertas com prazo vencido", icon: TriangleAlert, tone: "text-rose-600 bg-rose-50" },
    { label: "Tempo de resolução", value: `${summary.actions.averageResolutionDays}d`, hint: "média da criação à conclusão final", icon: Clock3, tone: "text-violet-600 bg-violet-50" },
    { label: "Sem próxima ação", value: summary.clientsWithoutNextAction.length, hint: "clientes ativos sem tarefa aberta", icon: UserRoundX, tone: "text-amber-700 bg-amber-50" },
    { label: "Alertas sem tratamento", value: summary.alerts.untreated, hint: `${summary.alerts.overdue} de prioridade alta atrasados`, icon: BellRing, tone: "text-orange-700 bg-orange-50" },
  ];

  const monthMax = Math.max(
    ...summary.monthlyEvolution.flatMap((month) => [month.interactions, month.completedActions]),
    1,
  );

  return (
    <section aria-labelledby="management-title" className="space-y-4">
      <div>
        <h2 id="management-title" className="text-lg font-semibold">Execução da carteira</h2>
        <p className="text-sm text-muted-foreground">Responsabilidade, ações e tratamento dos alertas da carteira ativa.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {indicators.map(({ label, value, hint, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full ${tone}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs font-medium">{label}</p>
              <p className="text-[11px] text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clientes por responsável</CardTitle>
            <CardDescription>Clientes ativos sob responsabilidade direta, incluindo contas sem definição.</CardDescription>
          </CardHeader>
          <CardContent><CountList items={summary.clientsByOwner} empty="Nenhum cliente ativo na carteira." /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interações por responsável</CardTitle>
            <CardDescription>Volume histórico registrado por responsável, incluindo registros sem atribuição.</CardDescription>
          </CardHeader>
          <CardContent><CountList items={summary.interactionsByOwner} empty="Nenhuma interação registrada na carteira ativa." /></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cobertura de stakeholders</CardTitle>
            <CardDescription>Percentual dos quatro papéis estratégicos cobertos na carteira.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <p className="text-3xl font-bold tabular-nums">{summary.stakeholderCoverage.percent}%</p>
              <p className="text-right text-xs text-muted-foreground">{summary.stakeholderCoverage.concentratedClients} cliente(s)<br />com relação concentrada</p>
            </div>
            <ul className="space-y-2">
              {summary.stakeholderCoverage.byRole.map((item) => (
                <li key={item.role} className="flex items-center justify-between text-sm">
                  <span>{ROLE_LABELS[item.role]}</span>
                  <span className="tabular-nums text-muted-foreground">{item.clients} · {item.percent}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita em risco</CardTitle>
            <CardDescription>Parcela do contrato não coberta pela probabilidade dos planos de renovação abertos.</CardDescription>
          </CardHeader>
          <CardContent>
            <CircleDollarSign className="mb-4 h-7 w-7 text-rose-600" aria-hidden="true" />
            <p className="text-3xl font-bold tabular-nums">{formatBRL(summary.revenueAtRisk)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Cálculo: valor contratado × (1 − probabilidade de renovação).</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clientes sem próxima ação</CardTitle>
            <CardDescription>Contas ativas sem tarefa pendente, em andamento ou adiada.</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.clientsWithoutNextAction.length === 0 ? (
              <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Toda a carteira possui uma próxima ação definida.</p>
            ) : (
              <ul className="max-h-44 space-y-2 overflow-y-auto">
                {summary.clientsWithoutNextAction.map((client) => (
                  <li key={client.id}><Link className="text-sm font-medium hover:underline" href={`/accounts/${client.id}`}>{client.name}</Link></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução mensal</CardTitle>
          <CardDescription>Interações registradas e transições de ações para concluídas nos seis meses mais recentes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <caption className="sr-only">Evolução mensal de interações e ações concluídas</caption>
              <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2 font-medium">Mês</th><th className="pb-2 font-medium">Interações</th><th className="pb-2 font-medium">Ações concluídas</th></tr></thead>
              <tbody>
                {summary.monthlyEvolution.map((month) => (
                  <tr key={month.key} className="border-b last:border-0">
                    <th scope="row" className="py-3 pr-4 text-left font-medium capitalize">{month.label}</th>
                    <td className="w-[42%] py-3 pr-5"><div className="flex items-center gap-3"><span className="w-8 tabular-nums">{month.interactions}</span><div className="h-2 flex-1 rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-blue-600" style={{ width: `${(month.interactions / monthMax) * 100}%` }} /></div></div></td>
                    <td className="w-[42%] py-3"><div className="flex items-center gap-3"><span className="w-8 tabular-nums">{month.completedActions}</span><div className="h-2 flex-1 rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${(month.completedActions / monthMax) * 100}%` }} /></div></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
