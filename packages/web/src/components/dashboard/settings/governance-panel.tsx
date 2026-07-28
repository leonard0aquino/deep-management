import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActionTask, Client, ClientCommercialPlan, ClientSuccessPlan, InteractionView, StakeholderHealth } from "@/lib/types/database";
import { buildDataQualityPortfolio } from "@/services/data-quality";

const RULES = [
  "Cada cliente ativo deve ter um responsável principal.",
  "Interações relevantes devem ser registradas em até 24 horas.",
  "Cliente, produto, tipo, tema, data e responsável são campos mínimos.",
  "Alertas viram tarefa atribuída ou dispensa justificada.",
  "A qualidade da carteira deve ser revisada semanalmente.",
];

export function GovernancePanel({
  clients,
  interactions,
  stakeholders,
  successPlans,
  tasks,
  commercialPlans,
  referenceDate,
  staleAfterDays,
}: {
  clients: Client[];
  interactions: InteractionView[];
  stakeholders: StakeholderHealth[];
  successPlans: ClientSuccessPlan[];
  tasks: ActionTask[];
  commercialPlans: ClientCommercialPlan[];
  referenceDate: string;
  staleAfterDays: number;
}) {
  const summary = buildDataQualityPortfolio({ clients, interactions, stakeholders, successPlans, tasks, commercialPlans, referenceDate, staleAfterDays });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" aria-hidden="true" />
            <h2>Governança da carteira</h2>
          </CardTitle>
          <CardDescription>Regras internas que mantêm clientes, compromissos e dados com responsabilidade clara.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-3xl font-semibold tabular-nums">{summary.averageScore}</p>
            <p className="mt-1 text-xs text-muted-foreground">média de qualidade da carteira</p>
            <p className="mt-3 text-xs">{summary.completeClients} de {summary.activeClients} clientes com 100 pontos</p>
          </div>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {RULES.map((rule) => (
              <li key={rule} className="flex items-start gap-2 rounded-lg border p-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Pendências de governança">
        {summary.issueCounts.map((issue) => (
          <Card key={issue.key} size="sm" className="shadow-none">
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline" className={issue.count ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                  {issue.count}
                </Badge>
                {issue.count ? <AlertTriangle className="size-4 text-amber-600" aria-hidden="true" /> : <ClipboardCheck className="size-4 text-emerald-600" aria-hidden="true" />}
              </div>
              <h3 className="mt-3 text-sm font-semibold">{issue.label}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{issue.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="flex justify-end">
        <Link href="/analytics#data-quality" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Ver qualidade detalhada
        </Link>
      </div>
    </div>
  );
}
