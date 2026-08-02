"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INTERACTION_TYPE_CONFIG } from "@/lib/interaction-type";
import { formatLocalDateGroup } from "@/lib/local-date";
import { Button } from "@/components/ui/button";
import { InteractionFormDialog } from "@/components/dashboard/registros/interaction-form-dialog";
import type { Client, ClientContact, ClientProduct, ClientProductOwner, DeepManager, InteractionType, InteractionView, Product } from "@/lib/types/database";

const ALL = "__all__";

export function productsForActivityClient(
  products: Product[],
  clientProducts: ClientProduct[],
  clientId: string,
) {
  if (clientId === ALL) return products;
  const productIds = new Set(
    clientProducts
      .filter((item) => item.active && item.client_id === clientId)
      .map((item) => item.product_id),
  );
  return products.filter((item) => productIds.has(item.id));
}

export function filterActivityInteractions(
  interactions: InteractionView[],
  filters: { managerId: string; clientId: string; productId: string; type: string },
) {
  return interactions.filter((interaction) => {
    if (filters.managerId !== ALL && interaction.manager_id !== filters.managerId) return false;
    if (filters.clientId !== ALL && interaction.client_id !== filters.clientId) return false;
    if (filters.productId !== ALL && interaction.product_id !== filters.productId) return false;
    if (filters.type !== ALL && interaction.interaction_type !== filters.type) return false;
    return true;
  });
}

export function RelationshipsAgenda({
  interactions,
  managers,
  clients,
  products,
  contacts,
  clientProducts,
  clientProductOwners,
  editableInteractionIds,
  restrictToAssignedPortfolio = false,
}: {
  interactions: InteractionView[];
  managers: DeepManager[];
  clients: Client[];
  products: Product[];
  contacts: ClientContact[];
  clientProducts: ClientProduct[];
  clientProductOwners: ClientProductOwner[];
  editableInteractionIds?: string[];
  restrictToAssignedPortfolio?: boolean;
}) {
  const [managerFilter, setManagerFilter] = useState(ALL);
  const [clientFilter, setClientFilter] = useState(ALL);
  const [productFilter, setProductFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [editing, setEditing] = useState<InteractionView | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const editableIds = useMemo(() => new Set(editableInteractionIds ?? interactions.map((item) => item.id)), [editableInteractionIds, interactions]);
  const activityManagerIds = useMemo(
    () => new Set([
      ...clientProductOwners.filter((owner) => owner.active).map((owner) => owner.manager_id),
      ...interactions.flatMap((interaction) => interaction.manager_id ? [interaction.manager_id] : []),
    ]),
    [clientProductOwners, interactions],
  );
  const activityManagers = useMemo(
    () => managers.filter((manager) => activityManagerIds.has(manager.id)),
    [activityManagerIds, managers],
  );

  function openEdit(event: InteractionView) {
    setEditing(event);
    setDialogOpen(true);
  }

  const filtered = filterActivityInteractions(interactions, {
    managerId: managerFilter,
    clientId: clientFilter,
    productId: productFilter,
    type: typeFilter,
  });

  const visibleProducts = useMemo(
    () => productsForActivityClient(products, clientProducts, clientFilter),
    [clientFilter, clientProducts, products],
  );

  const groups = useMemo(() => {
    const map = new Map<string, InteractionView[]>();
    for (const i of filtered) {
      const key = i.occurred_at;
      const list = map.get(key) ?? [];
      list.push(i);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <Select value={managerFilter} onValueChange={(v) => setManagerFilter(v ?? ALL)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os responsáveis">
              {(v: string | null) =>
                v === ALL || !v ? "Todos os responsáveis" : managers.find((m) => m.id === v)?.name ?? "Responsável"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os responsáveis</SelectItem>
            {activityManagers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={clientFilter}
          onValueChange={(value) => {
            setClientFilter(value ?? ALL);
            setProductFilter(ALL);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os clientes">
              {(value: string | null) =>
                value === ALL || !value ? "Todos os clientes" : clients.find((client) => client.id === value)?.name ?? "Cliente"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os clientes</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={productFilter} onValueChange={(value) => setProductFilter(value ?? ALL)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os produtos">
              {(value: string | null) =>
                value === ALL || !value ? "Todos os produtos" : products.find((product) => product.id === value)?.name ?? "Produto"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os produtos</SelectItem>
            {visibleProducts.map((product) => (
              <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter((v ?? ALL) as typeof typeFilter)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os tipos">
              {(v: string | null) =>
                v === ALL || !v ? "Todos os tipos" : INTERACTION_TYPE_CONFIG[v as InteractionType].label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os tipos</SelectItem>
            {(Object.keys(INTERACTION_TYPE_CONFIG) as InteractionType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {INTERACTION_TYPE_CONFIG[type].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {groups.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma interação encontrada para esse filtro.
        </p>
      )}

      {groups.map(([date, events]) => (
        <div key={date}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground capitalize">
            {formatLocalDateGroup(date)}
          </h3>
          <div className="space-y-1.5">
            {events.map((event) => {
              const config = INTERACTION_TYPE_CONFIG[event.interaction_type];
              const Icon = config.icon;
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-muted/50"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <Link href={`/accounts/${event.client_id}`} className="min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <p className="truncate font-medium">
                      {event.client_name} · {event.product_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{event.topic}</p>
                  </Link>
                  {event.manager_name && (
                    <span className="shrink-0 text-xs text-muted-foreground">{event.manager_name}</span>
                  )}
                  {editableIds.has(event.id) && <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(event)} aria-label={`Editar atividade: ${event.topic}`}>
                    <Pencil /> Editar
                  </Button>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <InteractionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clients={clients}
        products={products}
        managers={managers}
        contacts={contacts}
        clientProducts={clientProducts}
        clientProductOwners={clientProductOwners}
        editing={editing}
        restrictToAssignedPortfolio={restrictToAssignedPortfolio}
      />
    </div>
  );
}
