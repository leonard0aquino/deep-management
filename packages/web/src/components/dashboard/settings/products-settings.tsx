"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { revalidateDashboardCache } from "@/lib/actions/revalidate-dashboard";
import type { Product } from "@/lib/types/database";

function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `produto-${Date.now()}`
  );
}

export function ProductsSettings({ products }: { products: Product[] }) {
  const router = useRouter();
  const [list, setList] = useState(products);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  async function addProduct() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("products")
      .insert({ name, slug: slugify(name) })
      .select()
      .single();
    setSaving(false);
    if (dbError) {
      setError(`Não foi possível adicionar o produto: ${dbError.message}`);
      return;
    }
    if (data) {
      setList((prev) => [...prev, data]);
      setNewName("");
    }
  }

  async function toggleActive(product: Product) {
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("products")
      .update({ active: !product.active })
      .eq("id", product.id);
    if (dbError) {
      setError(`Não foi possível atualizar "${product.name}": ${dbError.message}`);
      return;
    }
    setList((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p)));
    await revalidateDashboardCache();
    router.refresh();
  }

  async function removeProduct(product: Product) {
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("products").delete().eq("id", product.id);
    if (dbError) {
      setError(`Não foi possível excluir "${product.name}": ${dbError.message}`);
      setConfirmingDelete(null);
      return;
    }
    setList((prev) => prev.filter((p) => p.id !== product.id));
    setConfirmingDelete(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos</CardTitle>
        <CardDescription>Produtos monitorados na plataforma</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        {list.map((product) => (
          <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: product.color ?? "#2563eb" }}
              />
              <p className={`truncate text-sm font-medium ${!product.active ? "text-muted-foreground line-through" : ""}`}>
                {product.name}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Switch checked={product.active} onCheckedChange={() => toggleActive(product)} />
              {confirmingDelete === product.id ? (
                <>
                  <Button variant="destructive" size="sm" onClick={() => removeProduct(product)}>Confirmar</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(null)}>Cancelar</Button>
                </>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => setConfirmingDelete(product.id)} aria-label={`Excluir ${product.name}`}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <Input
            placeholder="Nome do novo produto"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProduct()}
          />
          <Button onClick={addProduct} disabled={saving || !newName.trim()} className="shrink-0 gap-1.5">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
