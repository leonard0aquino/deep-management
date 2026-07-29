"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INTERACTION_TYPE_CONFIG } from "@/lib/interaction-type";
import { InteractionFormDialog } from "@/components/dashboard/registros/interaction-form-dialog";
import { InteractionMemoryDetails } from "@/components/dashboard/client/interaction-memory-details";
import type { DashboardData } from "@/lib/data";
import type { InteractionView } from "@/lib/types/database";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function Timeline({
  interactions,
  data,
  scope = "client",
}: {
  interactions: InteractionView[];
  data: DashboardData;
  scope?: "client" | "product";
}) {
  const [editing, setEditing] = useState<InteractionView | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const isProductTimeline = scope === "product";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
        <CardDescription>
          Histórico completo das interações {isProductTimeline ? "deste produto" : "com este cliente"} · clique para editar
        </CardDescription>
      </CardHeader>
      <CardContent>
        {interactions.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma interação registrada {isProductTimeline ? "com este produto" : "com este cliente"} ainda.
          </p>
        )}
        <ol className="relative space-y-0">
          {interactions.map((i, index) => {
            const config = INTERACTION_TYPE_CONFIG[i.interaction_type];
            const Icon = config.icon;
            const isLast = index === interactions.length - 1;
            return (
              <li key={i.id} className="relative flex gap-4 pb-6">
                {!isLast && (
                  <span className="absolute top-9 left-4 h-[calc(100%-1.25rem)] w-px bg-border" />
                )}
                <div
                  className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.tone}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(i);
                    setDialogOpen(true);
                  }}
                  className="min-w-0 flex-1 rounded-lg p-2 -mt-1 text-left transition-colors hover:bg-muted/60"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{i.topic}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(i.occurred_at)}
                    {i.manager_name && ` · ${i.manager_name}`}
                    {isProductTimeline
                      ? i.client_name && ` · ${i.client_name}`
                      : i.product_name && ` · ${i.product_name}`}
                  </p>
                  <InteractionMemoryDetails interaction={i} />
                  {(i.links ?? []).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {i.links.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-blue-600 underline hover:text-blue-700"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </CardContent>

      <InteractionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clients={data.clients}
        products={data.products}
        managers={data.managers}
        contacts={data.contacts}
        clientProducts={data.clientProducts}
        editing={editing}
      />
    </Card>
  );
}
