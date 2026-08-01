import { Fragment } from "react";
import { formatRecency } from "@/lib/status";
import { TV_STATUS_CELL } from "@/lib/tv-status";
import type { Client, ClientProductMatrixRow, Product } from "@/lib/types/database";

export function TvHeatmap({
  clients,
  products,
  matrix,
}: {
  clients: Client[];
  products: Product[];
  matrix: ClientProductMatrixRow[];
}) {
  const cellFor = (clientId: string, productId: string) =>
    matrix.find((m) => m.client_id === clientId && m.product_id === productId);

  if (clients.length === 0 || products.length === 0) {
    return <p className="text-sm text-[var(--tv-subtle)]">Sem clientes ou produtos para exibir.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `180px repeat(${clients.length}, minmax(120px, 1fr))` }}
      >
        <div />
        {clients.map((client) => (
          <div key={client.id} className="flex items-end justify-center pb-1 text-center">
            <span className="truncate text-xs font-semibold tracking-wide text-[var(--tv-muted)] uppercase">
              {client.name}
            </span>
          </div>
        ))}

        {products.map((product) => (
          <Fragment key={product.id}>
            <div className="flex items-center gap-2 truncate pr-2 text-sm text-[var(--tv-heading)]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: product.color ?? "#2563eb" }}
              />
              <span className="truncate">{product.name}</span>
            </div>
            {clients.map((client) => {
              const cell = cellFor(client.id, product.id);
              if (!cell) {
                return (
                  <div key={client.id} className="h-9 rounded-md border border-dashed border-[var(--tv-border)]" />
                );
              }
              return (
                <div
                  key={client.id}
                  className={`flex h-9 items-center justify-center rounded-md border text-xs font-semibold ${TV_STATUS_CELL[cell.status]}`}
                >
                  {formatRecency(cell.days_since_contact)}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
