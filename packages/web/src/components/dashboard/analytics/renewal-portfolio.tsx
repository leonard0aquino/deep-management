import Link from "next/link";
import { CalendarClock, CircleDollarSign, RefreshCw, TrendingUp, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseLocalDate } from "@/lib/local-date";
import type { RenewalPortfolioSummary } from "@/services/renewal-expansion";
import { COMMERCIAL_PLAN_STATUS, formatBRL } from "@/services/renewal-expansion";

export function RenewalPortfolio({ summary }: { summary: RenewalPortfolioSummary }) {
  const indicators = [
    { label: "Contratos ativos", value: summary.activeContractValue, hint: "valor vigente da carteira", icon: WalletCards },
    { label: "Renovação em 90 dias", value: summary.renewalValue90Days, hint: "valor contratado no período", icon: CalendarClock },
    { label: "Renovação em 180 dias", value: summary.renewalValue180Days, hint: "valor contratado no período", icon: RefreshCw },
    { label: "Pipeline de renovação", value: summary.weightedRenewalPipeline, hint: "valor esperado × probabilidade", icon: CircleDollarSign },
    { label: "Pipeline de expansão", value: summary.weightedExpansionPipeline, hint: "valor potencial × probabilidade", icon: TrendingUp },
  ];

  return (
    <section aria-labelledby="renewal-portfolio-title" className="space-y-4">
      <div>
        <h2 id="renewal-portfolio-title" className="text-lg font-semibold">Renovação e expansão da carteira</h2>
        <p className="text-sm text-muted-foreground">Previsão financeira ponderada e contratos que exigem preparação.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {indicators.map(({ label, value, hint, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <Icon className="mb-3 h-5 w-5 text-emerald-600" aria-hidden="true" />
              <p className="text-xl font-bold tabular-nums">{formatBRL(value)}</p>
              <p className="text-xs font-medium">{label}</p>
              <p className="text-[11px] text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximas renovações — 180 dias</CardTitle>
          <CardDescription>Ordenadas pela proximidade da data contratual.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.upcoming.length === 0 ? (
            <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Nenhuma renovação prevista para os próximos 180 dias.</p>
          ) : (
            <div className="divide-y">
              {summary.upcoming.map(({ client, plan, daysRemaining }) => (
                <div key={client.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/accounts/${client.id}`} className="font-medium hover:underline">{client.name}</Link>
                    <p className="text-xs text-muted-foreground">{parseLocalDate(client.contract_renewal_date!).toLocaleDateString("pt-BR")} · em {daysRemaining} dias · {formatBRL(Number(client.contract_value ?? 0))}</p>
                  </div>
                  {plan ? <Badge variant="outline">{COMMERCIAL_PLAN_STATUS[plan.status]} · {plan.probability}%</Badge> : <Badge variant="secondary">Plano pendente</Badge>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
