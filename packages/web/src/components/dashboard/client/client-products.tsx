"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { revalidateDashboardCache } from "@/lib/actions/revalidate-dashboard";
import { STATUS_CONFIG, formatRecency } from "@/lib/status";
import type { ClientProduct, ClientProductMatrixRow, ClientProductOwner, DeepManager, Product } from "@/lib/types/database";

export function ClientProducts({
  assignments,
  owners,
  rows,
  products,
  managers,
  canManage,
}: {
  assignments: ClientProduct[];
  owners: ClientProductOwner[];
  rows: ClientProductMatrixRow[];
  products: Product[];
  managers: DeepManager[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const matrixByProduct = new Map(rows.map((row) => [row.product_id, row]));
  const productsById = new Map(products.map((product) => [product.id, product]));

  function setOwner(assignmentId: string, managerId: string, selected: boolean) {
    setFeedback(null);
    startTransition(async () => {
      const existing = owners.find(
        (owner) => owner.client_product_id === assignmentId && owner.manager_id === managerId,
      );
      const query = createClient().from("client_product_owners");
      const { error } = selected
        ? existing
          ? await query.update({ active: true }).eq("id", existing.id)
          : await query.insert({ client_product_id: assignmentId, manager_id: managerId })
        : existing
          ? await query.delete().eq("id", existing.id)
          : { error: null };
      if (error) {
        setFeedback(error.message);
        return;
      }
      setFeedback("Responsáveis atualizados.");
      await revalidateDashboardCache();
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos Contratados</CardTitle>
        <CardDescription>
          {assignments.length} produto{assignments.length === 1 ? "" : "s"} · responsabilidade definida por cliente e produto
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {assignments.map((assignment) => {
          const product = productsById.get(assignment.product_id);
          const row = matrixByProduct.get(assignment.product_id);
          const status = row ? STATUS_CONFIG[row.status] : null;
          const assignedOwnerIds = new Set(
            owners
              .filter((owner) => owner.active && owner.client_product_id === assignment.id)
              .map((owner) => owner.manager_id),
          );
          const assignedOwners = managers.filter((manager) => assignedOwnerIds.has(manager.id));
          return (
            <div key={assignment.id} className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: product?.color ?? "#2563eb" }} />
                  {product?.name ?? "Produto indisponível"}
                </span>
                {row && <span className="text-sm font-bold tabular-nums">{row.composite_score}</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {row && status ? (
                  <>
                    <Badge variant="outline" className={status.badge}>{formatRecency(row.days_since_contact)} · {status.label}</Badge>
                    <span className="text-xs text-muted-foreground">{row.interaction_count} interaç{row.interaction_count === 1 ? "ão" : "ões"}</span>
                  </>
                ) : (
                  <Badge variant="outline">Sem interação registrada</Badge>
                )}
              </div>
              <div className="mt-3 space-y-2 text-xs font-medium">
                <p>Responsáveis AISphere</p>
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    {managers.filter((manager) => manager.active).map((manager) => (
                      <label key={manager.id} className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-normal">
                        <input
                          type="checkbox"
                          aria-label={`${manager.name} responsável por ${product?.name ?? "produto"}`}
                          checked={assignedOwnerIds.has(manager.id)}
                          disabled={pending}
                          onChange={(event) => setOwner(assignment.id, manager.id, event.target.checked)}
                        />
                        {manager.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <span className={assignedOwners.length ? "block text-muted-foreground" : "block text-amber-700"}>
                    {assignedOwners.length ? assignedOwners.map((owner) => owner.name).join(", ") : "Sem responsável"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {assignments.length === 0 && <p className="col-span-2 py-6 text-center text-sm text-muted-foreground">Nenhum produto vinculado a este cliente.</p>}
        {feedback && <p role="status" className={`col-span-2 text-xs ${feedback === "Responsáveis atualizados." ? "text-emerald-700" : "text-destructive"}`}>{feedback}</p>}
      </CardContent>
    </Card>
  );
}
