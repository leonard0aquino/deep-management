import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { formatRecency } from "@/lib/status";
import type { ClientProductMatrixRow } from "@/lib/types/database";

export function ClientPending({
  pending,
  nextSteps,
}: {
  pending: ClientProductMatrixRow[];
  nextSteps: ClientProductMatrixRow[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-red-700">
            <AlertTriangle className="h-4 w-4" />
            Pendências
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma pendência crítica no momento.</p>
          )}
          {pending.map((row) => (
            <div key={row.product_id} className="flex items-center justify-between text-sm">
              <span>{row.product_name}</span>
              <span className="text-muted-foreground">{formatRecency(row.days_since_contact)} sem contato</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-amber-700">
            <ArrowRight className="h-4 w-4" />
            Próximos Passos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {nextSteps.length === 0 && (
            <p className="text-sm text-muted-foreground">Nada exigindo atenção imediata.</p>
          )}
          {nextSteps.map((row) => (
            <div key={row.product_id} className="flex items-center justify-between text-sm">
              <span>{row.product_name}</span>
              <span className="text-muted-foreground">Agendar próximo contato</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
