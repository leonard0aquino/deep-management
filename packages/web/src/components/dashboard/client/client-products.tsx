import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG, formatRecency } from "@/lib/status";
import type { ClientProductMatrixRow } from "@/lib/types/database";

export function ClientProducts({ rows }: { rows: ClientProductMatrixRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos Contratados</CardTitle>
        <CardDescription>{rows.length} produto{rows.length === 1 ? "" : "s"} com histórico de interação</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((row) => {
          const status = STATUS_CONFIG[row.status];
          return (
            <div key={row.product_id} className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: row.product_color ?? "#2563eb" }}
                  />
                  {row.product_name}
                </span>
                <span className="text-sm font-bold tabular-nums">{row.composite_score}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className={status.badge}>
                  {formatRecency(row.days_since_contact)} · {status.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {row.interaction_count} interaç{row.interaction_count === 1 ? "ão" : "ões"}
                </span>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="col-span-2 py-6 text-center text-sm text-muted-foreground">
            Nenhum produto com interação registrada ainda.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
