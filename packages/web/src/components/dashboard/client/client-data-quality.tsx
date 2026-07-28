import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientDataQualityReport } from "@/services/data-quality";

export function ClientDataQuality({ report }: { report: ClientDataQualityReport }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {report.issues.length === 0 ? <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" /> : <TriangleAlert className="size-4 text-amber-600" aria-hidden="true" />}
              <h2>Qualidade dos dados</h2>
            </CardTitle>
            <CardDescription>Oito verificações operacionais desta conta.</CardDescription>
          </div>
          <Badge variant="outline" className={report.score === 100 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{report.score}/100 · {report.passedChecks} de {report.totalChecks}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {report.issues.length === 0 ? (
          <p className="text-sm font-medium text-emerald-700">Todos os dados essenciais estão completos e atualizados.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {report.issues.map((item) => (
              <li key={item.key} className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
