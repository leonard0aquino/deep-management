import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_CONFIG } from "@/lib/status";
import type { ClientProductMatrixRow, RelationshipStatus } from "@/lib/types/database";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity } from "lucide-react";

const ORDER: RelationshipStatus[] = ["recente", "ok", "atencao", "alerta", "critico"];

export function HealthDistribution({ matrix }: { matrix: ClientProductMatrixRow[] }) {
  const total = matrix.length;
  const rows = ORDER.map((status) => {
    const count = matrix.filter((m) => m.status === status).length;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return { status, count, pct };
  });
  const maxCount = Math.max(...rows.map((r) => r.count), 1);

  return (
    <Card className="min-h-[390px] rounded-xl shadow-none ring-black/[0.08]">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-[13px]">Distribuição de Saúde</CardTitle>
        <CardDescription className="text-[11px]">{total} combinações cliente-produto por status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {total > 0 && rows.map((row) => {
          const config = STATUS_CONFIG[row.status];
          const widthPct = Math.max((row.count / maxCount) * 100, row.count > 0 ? 6 : 0);
          return (
            <div key={row.status}>
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="font-medium">{config.label}</span>
                <span className="text-muted-foreground tabular-nums">{row.count} casos · {row.pct}%</span>
              </div>
              <div className="relative h-6 overflow-hidden rounded-md bg-muted">
                <div
                  className={`flex h-full items-center rounded-md ${config.dot} transition-all`}
                  style={{ width: `${widthPct}%` }}
                >
                  {row.count > 0 && widthPct > 12 && (
                    <span className="pl-2 text-[10px] font-semibold text-white tabular-nums">{row.count}</span>
                  )}
                </div>
                {row.count > 0 && widthPct <= 12 && (
                  <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-semibold tabular-nums">
                    {row.count}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {total === 0 && (
          <EmptyState compact icon={Activity} title="Sem dados de saúde" description="Não há combinações cliente-produto para os filtros selecionados." />
        )}
      </CardContent>
    </Card>
  );
}
