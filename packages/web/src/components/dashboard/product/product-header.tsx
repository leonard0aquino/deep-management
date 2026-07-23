import { Card, CardContent } from "@/components/ui/card";
import { scoreLabel, scoreToneClass } from "@/lib/status";
import type { Product } from "@/lib/types/database";

export function ProductHeader({
  product,
  avgScore,
  clientsCount,
  interactionsCount,
  avgRelevance,
}: {
  product: Product;
  avgScore: number | null;
  clientsCount: number;
  interactionsCount: number;
  avgRelevance: number;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: product.color ?? "#2563eb" }}
          />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{product.name}</h1>
            <p className="text-sm text-muted-foreground">
              {clientsCount} cliente{clientsCount === 1 ? "" : "s"} · {interactionsCount} interaç
              {interactionsCount === 1 ? "ão" : "ões"} · relevância média {avgRelevance.toFixed(1)}
            </p>
          </div>
        </div>
        {avgScore != null ? (
          <div className="text-right">
            <p className={`text-3xl font-bold tabular-nums ${scoreToneClass(avgScore)}`}>{avgScore}</p>
            <p className={`text-xs font-medium ${scoreToneClass(avgScore)}`}>{scoreLabel(avgScore)}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem interações registradas ainda</p>
        )}
      </CardContent>
    </Card>
  );
}
