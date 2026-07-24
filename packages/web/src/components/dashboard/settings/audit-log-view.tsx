import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { changedFields, describeAuditEntry } from "@/lib/audit-log";
import type { AuditLogEntry } from "@/lib/types/database";

const ACTION_BADGE: Record<string, string> = {
  INSERT: "bg-emerald-100 text-emerald-700 border-emerald-200",
  UPDATE: "bg-amber-100 text-amber-700 border-amber-200",
  DELETE: "bg-red-100 text-red-700 border-red-200",
};

export function AuditLogView({ entries }: { entries: AuditLogEntry[] }) {
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
        {entries.map((entry) => {
          const fields = changedFields(entry);
          return (
            <details key={entry.id} className="rounded-lg border p-2.5 text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={ACTION_BADGE[entry.action] ?? ""}>
                    {entry.action}
                  </Badge>
                  <span>{describeAuditEntry(entry)}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString("pt-BR")}
                </span>
              </summary>
              <div className="mt-2 space-y-1.5">
                {fields.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Campos alterados: {fields.join(", ")}
                  </p>
                )}
                <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
                  {JSON.stringify(entry.diff, null, 2)}
                </pre>
              </div>
            </details>
          );
        })}
      </CardContent>
    </Card>
  );
}
