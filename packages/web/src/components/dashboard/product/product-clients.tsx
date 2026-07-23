import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG, formatRecency } from "@/lib/status";
import type { ClientProductMatrixRow } from "@/lib/types/database";

export function ProductClients({ rows }: { rows: ClientProductMatrixRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes</CardTitle>
        <CardDescription>{rows.length} cliente{rows.length === 1 ? "" : "s"} com este produto</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => {
          const status = STATUS_CONFIG[row.status];
          return (
            <Link
              key={row.client_id}
              href={`/accounts/${row.client_id}`}
              className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted/60"
            >
              <span className="font-medium">{row.client_name}</span>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={status.badge}>
                  {formatRecency(row.days_since_contact)} · {status.label}
                </Badge>
                <span className="w-8 text-right font-bold tabular-nums">{row.composite_score}</span>
              </div>
            </Link>
          );
        })}
        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum cliente com interação registrada para este produto.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
