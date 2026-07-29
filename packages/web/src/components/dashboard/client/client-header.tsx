import { Card, CardContent } from "@/components/ui/card";
import { scoreLabel, scoreToneClass } from "@/lib/status";
import type { Client, ClientHealth } from "@/lib/types/database";
import { parseLocalDate } from "@/lib/local-date";

function formatCurrency(value: number | null): string | null {
  if (value == null) return null;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function ClientHeader({ client, health, ownerCount, unassignedProductCount }: { client: Client; health: ClientHealth | undefined; ownerCount: number; unassignedProductCount: number }) {
  const contractValue = formatCurrency(client.contract_value);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {client.segment ?? "Sem segmento"}
            {contractValue && ` · ${contractValue}/ano`}
            {client.contract_renewal_date &&
              ` · renovação em ${parseLocalDate(client.contract_renewal_date).toLocaleDateString("pt-BR")}`}
          </p>
          <p className={`mt-1 text-xs ${unassignedProductCount === 0 ? "text-muted-foreground" : "font-medium text-amber-700"}`}>
            {ownerCount} {ownerCount === 1 ? "responsável" : "responsáveis"} por produto
            {unassignedProductCount > 0 && ` · ${unassignedProductCount} produto${unassignedProductCount === 1 ? "" : "s"} sem responsável`}
          </p>
        </div>
        {health ? (
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className={`text-3xl font-bold tabular-nums ${scoreToneClass(health.score)}`}>
                {health.score}
              </p>
              <p className={`text-xs font-medium ${scoreToneClass(health.score)}`}>
                {scoreLabel(health.score)}
              </p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-right text-sm text-muted-foreground">
              <p>{health.tracked_products} produtos acompanhados</p>
              {health.critical_products > 0 && (
                <p className="text-red-600">{health.critical_products} em estado crítico</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem interações registradas ainda</p>
        )}
      </CardContent>
    </Card>
  );
}
