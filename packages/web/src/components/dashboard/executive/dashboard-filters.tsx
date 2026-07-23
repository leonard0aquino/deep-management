"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Client, DeepManager, Product, RelationshipStatus } from "@/lib/types/database";

const STATUS_OPTIONS: { value: RelationshipStatus; label: string }[] = [
  { value: "critico", label: "Crítico" },
  { value: "alerta", label: "Alerta" },
  { value: "atencao", label: "Atenção" },
  { value: "ok", label: "OK" },
  { value: "recente", label: "Recente" },
];

const FILTER_KEYS = ["period", "client", "product", "manager", "status", "view"] as const;

export function updateDashboardFilter(query: string, key: string, value: string) {
  const params = new URLSearchParams(query);
  params.delete("view");
  if (value) params.set(key, value);
  else params.delete(key);
  return params.toString();
}

export function DashboardFilters({
  clients,
  products,
  managers,
}: {
  clients: Client[];
  products: Product[];
  managers: DeepManager[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCount = FILTER_KEYS.filter((key) => searchParams.has(key)).length;

  function updateFilter(key: string, value: string) {
    const query = updateDashboardFilter(searchParams.toString(), key, value);
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  }

  const controlClass =
    "h-9 min-w-0 rounded-lg border border-input bg-white px-2.5 text-[12px] outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

  return (
    <section aria-label="Filtros do Cockpit" className="rounded-xl border bg-white p-3 shadow-none">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex shrink-0 items-center gap-2 text-[12px] font-medium">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Filtros
          {activeCount > 0 && (
            <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] text-white">
              {activeCount} ativo{activeCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          <label className="sr-only" htmlFor="filter-period">Período</label>
          <select id="filter-period" className={controlClass} value={searchParams.get("period") ?? ""} onChange={(event) => updateFilter("period", event.target.value)}>
            <option value="">Todo o período</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>

          <label className="sr-only" htmlFor="filter-client">Cliente</label>
          <select id="filter-client" className={controlClass} value={searchParams.get("client") ?? ""} onChange={(event) => updateFilter("client", event.target.value)}>
            <option value="">Todos os clientes</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>

          <label className="sr-only" htmlFor="filter-product">Produto</label>
          <select id="filter-product" className={controlClass} value={searchParams.get("product") ?? ""} onChange={(event) => updateFilter("product", event.target.value)}>
            <option value="">Todos os produtos</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>

          <label className="sr-only" htmlFor="filter-manager">Responsável</label>
          <select id="filter-manager" className={controlClass} value={searchParams.get("manager") ?? ""} onChange={(event) => updateFilter("manager", event.target.value)}>
            <option value="">Todos os responsáveis</option>
            {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
          </select>

          <label className="sr-only" htmlFor="filter-status">Status de saúde</label>
          <select id="filter-status" className={controlClass} value={searchParams.get("status") ?? ""} onChange={(event) => updateFilter("status", event.target.value)}>
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </div>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="self-start text-muted-foreground xl:self-auto" onClick={() => router.replace("/", { scroll: false })}>
            <RotateCcw aria-hidden="true" />
            Limpar filtros
          </Button>
        )}
      </div>
    </section>
  );
}
