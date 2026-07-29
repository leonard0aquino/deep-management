"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG, formatRecency } from "@/lib/status";
import { InteractionFormDialog } from "@/components/dashboard/registros/interaction-form-dialog";
import type { DashboardData } from "@/lib/data";
import type { InteractionView } from "@/lib/types/database";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquare } from "lucide-react";

export function RecentActivity({ data }: { data: DashboardData }) {
  const [editing, setEditing] = useState<InteractionView | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const recent = data.interactions.slice(0, 8);

  function openEdit(row: InteractionView) {
    setEditing(row);
    setDialogOpen(true);
  }

  return (
    <Card className="min-h-[310px] rounded-xl shadow-none ring-black/[0.08]">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-[13px]">Atividade Recente</CardTitle>
        <CardDescription className="text-[11px]">Últimas interações registradas · clique para editar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {recent.length === 0 && (
          <EmptyState compact icon={MessageSquare} title="Nenhuma interação encontrada" description="Ajuste os filtros ou registre uma nova interação para acompanhar a atividade." />
        )}
        {recent.map((row) => {
          const status = STATUS_CONFIG[row.status];
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => openEdit(row)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-[12px] transition-colors hover:bg-muted/60"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />
                <span className="truncate">
                  <span className="font-medium">{row.client_name}</span>
                  <span className="text-muted-foreground"> · {row.product_name} · {row.topic}</span>
                </span>
              </div>
              <Badge variant="outline" className={`shrink-0 ${status.badge}`}>
                {formatRecency(row.days_since_contact)}
              </Badge>
            </button>
          );
        })}
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
