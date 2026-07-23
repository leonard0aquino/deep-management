import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AuditLog } from "@/lib/types/database";

const ACTION_BADGE: Record<string, string> = {
  INSERT: "bg-emerald-100 text-emerald-700 border-emerald-200",
  UPDATE: "bg-amber-100 text-amber-700 border-amber-200",
  DELETE: "bg-red-100 text-red-700 border-red-200",
};

export function AuditLogView({ entries }: { entries: AuditLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditoria</CardTitle>
        <CardDescription>Últimas alterações em clientes, interações, produtos, gestores e contatos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {entries.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma alteração registrada ainda.
          </p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={ACTION_BADGE[entry.action] ?? ""}>
                {entry.action}
              </Badge>
              <span className="text-muted-foreground">{entry.table_name}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(entry.created_at).toLocaleString("pt-BR")}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
