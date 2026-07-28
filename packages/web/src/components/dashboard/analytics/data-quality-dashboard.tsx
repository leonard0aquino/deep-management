import Link from "next/link";
import { CheckCircle2, DatabaseZap, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DataQualityPortfolio } from "@/services/data-quality";

function scoreTone(score: number) {
  if (score >= 88) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (score >= 63) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

export function DataQualityDashboard({ summary }: { summary: DataQualityPortfolio }) {
  return (
    <section id="data-quality" aria-labelledby="data-quality-title" className="scroll-mt-6 space-y-4">
      <div>
        <h2 id="data-quality-title" className="text-lg font-semibold">Qualidade dos dados</h2>
        <p className="text-sm text-muted-foreground">Oito sinais operacionais por cliente para tornar as correções objetivas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <DatabaseZap className="mb-3 size-5 text-blue-600" aria-hidden="true" />
            <p className="text-3xl font-bold tabular-nums">{summary.averageScore}</p>
            <p className="text-sm font-medium">Média da carteira</p>
            <p className="text-xs text-muted-foreground">nota de qualidade entre 0 e 100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <CheckCircle2 className="mb-3 size-5 text-emerald-600" aria-hidden="true" />
            <p className="text-3xl font-bold tabular-nums">{summary.completeClients}</p>
            <p className="text-sm font-medium">Clientes completos</p>
            <p className="text-xs text-muted-foreground">de {summary.activeClients} clientes ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <TriangleAlert className="mb-3 size-5 text-amber-600" aria-hidden="true" />
            <p className="text-3xl font-bold tabular-nums">{summary.issueCounts.reduce((sum, item) => sum + item.count, 0)}</p>
            <p className="text-sm font-medium">Pendências encontradas</p>
            <p className="text-xs text-muted-foreground">somatório dos oito sinais</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendências recorrentes</CardTitle>
          <CardDescription>Quantidade de clientes ativos afetados por cada verificação.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {summary.issueCounts.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                <span>{item.label}</span>
                <Badge variant="outline" className={item.count > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>{item.count}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Qualidade por cliente</CardTitle>
          <CardDescription>Ordenado pela menor nota para priorizar a correção da carteira.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.reports.length === 0 ? (
            <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Nenhum cliente ativo na carteira.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <caption className="sr-only">Indicador de qualidade dos dados por cliente</caption>
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-5 font-medium">Cliente</th>
                    <th className="pb-2 pr-5 font-medium">Nota</th>
                    <th className="pb-2 pr-5 font-medium">Verificações</th>
                    <th className="pb-2 font-medium">Pendências</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.reports.map((report) => (
                    <tr key={report.client.id} className="border-b align-top last:border-0">
                      <th scope="row" className="py-3 pr-4 text-left font-medium">
                        <Link href={`/accounts/${report.client.id}`} className="hover:underline">{report.client.name}</Link>
                      </th>
                      <td className="py-3 pr-4"><Badge variant="outline" className={scoreTone(report.score)}>{report.score}/100</Badge></td>
                      <td className="py-3 pr-4 tabular-nums text-muted-foreground">{report.passedChecks} de {report.totalChecks}</td>
                      <td className="py-3">
                        {report.issues.length === 0 ? (
                          <span className="font-medium text-emerald-700">Dados completos</span>
                        ) : (
                          <ul className="flex flex-wrap gap-1.5">
                            {report.issues.map((item) => <li key={item.key}><Badge variant="secondary">{item.label}</Badge></li>)}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
