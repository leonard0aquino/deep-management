import Link from "next/link";
import { Activity, Clock3, HeartPulse, ShieldAlert, Siren, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Metric = {
  label: string;
  value: number | string;
  hint: string;
  icon: LucideIcon;
  tone: string;
  href: string;
};

export function MetricChips({
  healthScore,
  atRiskCount,
  criticalCount,
  averageAging,
  interactionsCount,
  filterQuery,
  targetScore,
}: {
  healthScore: number;
  atRiskCount: number;
  criticalCount: number;
  averageAging: number;
  interactionsCount: number;
  filterQuery: string;
  targetScore: number;
}) {
  function drilldown(key: "status" | "view", value: string, anchor: string) {
    const params = new URLSearchParams(filterQuery);
    if (key === "status") params.delete("view");
    if (key === "view") params.delete("status");
    params.set(key, value);
    return `/?${params.toString()}#${anchor}`;
  }

  const metrics: Metric[] = [
    {
      label: "Health Score geral",
      value: healthScore,
      hint: `Meta configurada: ${targetScore}`,
      icon: HeartPulse,
      tone: "bg-emerald-50 text-emerald-700",
      href: "#health-score",
    },
    {
      label: "Clientes em risco",
      value: atRiskCount,
      hint: "Investigar carteira",
      icon: ShieldAlert,
      tone: "bg-red-50 text-red-700",
      href: drilldown("view", "risk", "relationship-map"),
    },
    {
      label: "Relações críticas",
      value: criticalCount,
      hint: "Ver status crítico",
      icon: Siren,
      tone: "bg-orange-50 text-orange-700",
      href: drilldown("status", "critico", "relationship-map"),
    },
    {
      label: "Aging médio",
      value: `${averageAging}d`,
      hint: "Ver contatos atrasados",
      icon: Clock3,
      tone: "bg-amber-50 text-amber-700",
      href: drilldown("view", "stale", "relationship-map"),
    },
    {
      label: "Interações no recorte",
      value: interactionsCount,
      hint: "Ver atividade recente",
      icon: Activity,
      tone: "bg-blue-50 text-blue-700",
      href: "#recent-activity",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {metrics.map((metric) => (
        <Link key={metric.label} href={metric.href} className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <Card className="h-full rounded-xl py-0 shadow-none ring-black/[0.08] transition group-hover:-translate-y-0.5 group-hover:ring-black/20 group-hover:shadow-sm">
            <CardContent className="flex min-h-[116px] flex-col justify-between px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="mb-2 text-[11px] text-muted-foreground">{metric.label}</p>
                  <p className="text-[25px] font-medium leading-none tracking-tight tabular-nums">{metric.value}</p>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${metric.tone}`}>
                  <metric.icon className="h-[17px] w-[17px]" aria-hidden="true" />
                </div>
              </div>
              <p className="text-[10px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">{metric.hint} →</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
