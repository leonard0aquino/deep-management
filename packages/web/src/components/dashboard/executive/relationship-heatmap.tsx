"use client";

import { Fragment, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { STATUS_CONFIG, formatRecency } from "@/lib/status";
import type {
  Client,
  ClientProductMatrixRow,
  InteractionView,
  Product,
  RelationshipStatus,
} from "@/lib/types/database";
import { EmptyState } from "@/components/ui/empty-state";
import { Grid3X3 } from "lucide-react";

const NEXT_ACTION: Record<RelationshipStatus, string> = {
  critico: "Agendar contato urgente",
  alerta: "Agendar contato esta semana",
  atencao: "Monitorar de perto",
  ok: "Manter cadência atual",
  recente: "Manter cadência atual",
};

function mostFrequent(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function RelationshipHeatmap({
  clients,
  products,
  matrix,
  interactions,
}: {
  clients: Client[];
  products: Product[];
  matrix: ClientProductMatrixRow[];
  interactions: InteractionView[];
}) {
  const enrichment = useMemo(() => {
    const byCombo = new Map<string, InteractionView[]>();
    for (const i of interactions) {
      const key = `${i.client_id}::${i.product_id}`;
      const list = byCombo.get(key) ?? [];
      list.push(i);
      byCombo.set(key, list);
    }
    const result = new Map<string, { manager: string | null; topic: string | null }>();
    for (const [key, list] of byCombo.entries()) {
      result.set(key, {
        manager: mostFrequent(list.map((i) => i.manager_name).filter((v): v is string => !!v)),
        topic: mostFrequent(list.map((i) => i.topic)),
      });
    }
    return result;
  }, [interactions]);

  const cellFor = (clientId: string, productId: string) =>
    matrix.find((m) => m.client_id === clientId && m.product_id === productId);

  return (
    <Card className="rounded-xl shadow-none ring-black/[0.08]">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <div>
          <CardTitle className="text-[13px]">Mapa de Relacionamento</CardTitle>
          <CardDescription className="text-[11px]">Cobertura cruzada entre clientes e produtos</CardDescription>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {(Object.keys(STATUS_CONFIG) as RelationshipStatus[]).map((key) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_CONFIG[key].dot}`} />
              {STATUS_CONFIG[key].label}
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {clients.length === 0 || products.length === 0 ? (
          <EmptyState icon={Grid3X3} title="Mapa sem resultados" description="Ajuste ou limpe os filtros para visualizar os relacionamentos da carteira." />
        ) : <TooltipProvider>
          <div className="overflow-x-auto">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `140px repeat(${clients.length}, minmax(110px, 1fr))` }}
            >
              <div />
              {clients.map((client) => (
                <div key={client.id} className="text-center">
                  <span className="text-[11px] font-semibold tracking-wide uppercase">
                    {client.name}
                  </span>
                </div>
              ))}

              {products.map((product) => (
                <Fragment key={product.id}>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: product.color ?? "#2563eb" }}
                    />
                    {product.name}
                  </div>
                  {clients.map((client) => {
                    const cell = cellFor(client.id, product.id);
                    if (!cell) {
                      return (
                        <div
                          key={client.id + product.id}
                          className="flex h-16 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground"
                        >
                          —
                        </div>
                      );
                    }
                    const status = STATUS_CONFIG[cell.status];
                    const info = enrichment.get(`${client.id}::${product.id}`);
                    return (
                      <Tooltip key={client.id + product.id}>
                        <TooltipTrigger
                          className={`relative flex h-16 w-full appearance-none flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-medium ${status.cell}`}
                        >
                          <span className="absolute top-1.5 right-2 text-[10px] font-semibold">
                            {cell.composite_score}
                          </span>
                          <span className="font-semibold">{formatRecency(cell.days_since_contact)}</span>
                          <span className="text-[10px] uppercase">{status.label}</span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-64 space-y-0.5">
                          <p className="font-medium">
                            {client.name} · {product.name}
                          </p>
                          <p>Último contato: {cell.last_contact}</p>
                          <p>Score: {cell.composite_score} · Status: {status.label}</p>
                          {info?.manager && <p>Responsável: {info.manager}</p>}
                          {info?.topic && <p>Tema principal: {info.topic}</p>}
                          <p>Próxima ação: {NEXT_ACTION[cell.status]}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </TooltipProvider>}
      </CardContent>
    </Card>
  );
}
