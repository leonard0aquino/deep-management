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
import type { Client, ClientContact, ClientProduct, DeepManager, InteractionType, InteractionView, Product } from "@/lib/types/database";

const ALL = "__all__";

export function RelationshipsAgenda({
  interactions,
  managers,
  clients,
  products,
  contacts,
  clientProducts,
}: {
  interactions: InteractionView[];
  managers: DeepManager[];
  clients: Client[];
  products: Product[];
  contacts: ClientContact[];
  clientProducts: ClientProduct[];
}) {
  const [managerFilter, setManagerFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [editing, setEditing] = useState<InteractionView | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function openEdit(event: InteractionView) {
    setEditing(event);
    setDialogOpen(true);
  }

  const filtered = interactions.filter((i) => {
    if (managerFilter !== ALL && i.manager_name !== managerFilter) return false;
    if (typeFilter !== ALL && i.interaction_type !== typeFilter) return false;
    return true;
  });

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
            <SelectValue placeholder="Todos os executivos">
              {(v: string | null) => (v === ALL || !v ? "Todos os executivos" : v)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os executivos</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m.id} value={m.name}>
                {m.name}
              </SelectItem>
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
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(event)} aria-label={`Editar atividade: ${event.topic}`}>
                    <Pencil /> Editar
                  </Button>
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
        editing={editing}
      />
    </div>
  );
}
