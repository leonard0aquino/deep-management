"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { revalidateDashboardCache } from "@/lib/actions/revalidate-dashboard";
import { STATUS_CONFIG, formatRecency } from "@/lib/status";
import type { ClientProduct, ClientProductMatrixRow, DeepManager, Product } from "@/lib/types/database";

export function ClientProducts({
  assignments,
  rows,
  products,
  managers,
  canManage,
}: {
  assignments: ClientProduct[];
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

  function assign(assignmentId: string, ownerManagerId: string) {
    setFeedback(null);
    startTransition(async () => {
      const { error } = await createClient()
        .from("client_products")
        .update({ owner_manager_id: ownerManagerId || null })
        .eq("id", assignmentId);
      if (error) {
        setFeedback(error.message);
        return;
      }
      setFeedback("Responsabilidade atualizada.");
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
          const owner = managers.find((manager) => manager.id === assignment.owner_manager_id);
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
              <label className="mt-3 block space-y-1 text-xs font-medium">
                Responsável AISphere
                {canManage ? (
                  <select
                    aria-label={`Responsável por ${product?.name ?? "produto"}`}
                    value={assignment.owner_manager_id ?? ""}
                    disabled={pending}
                    onChange={(event) => assign(assignment.id, event.target.value)}
                    className="h-9 w-full rounded-lg border bg-background px-2.5"
                  >
                    <option value="">Sem responsável</option>
                    {managers.filter((manager) => manager.active).map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
                  </select>
                ) : (
                  <span className={owner ? "block text-muted-foreground" : "block text-amber-700"}>{owner?.name ?? "Sem responsável"}</span>
                )}
              </label>
            </div>
          );
        })}
        {assignments.length === 0 && <p className="col-span-2 py-6 text-center text-sm text-muted-foreground">Nenhum produto vinculado a este cliente.</p>}
        {feedback && <p role="status" className={`col-span-2 text-xs ${feedback === "Responsabilidade atualizada." ? "text-emerald-700" : "text-destructive"}`}>{feedback}</p>}
      </CardContent>
    </Card>
  );
}
