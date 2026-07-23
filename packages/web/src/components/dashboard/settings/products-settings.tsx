"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

  async function addProduct() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .insert({ name, slug: slugify(name) })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setList((prev) => [...prev, data]);
      setNewName("");
    }
  }

  async function toggleActive(product: Product) {
    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ active: !product.active })
      .eq("id", product.id);
    if (!error) {
      setList((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p)));
      router.refresh();
    }
  }

  async function removeProduct(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) setList((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos</CardTitle>
        <CardDescription>Produtos monitorados na plataforma</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
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
              <Button variant="ghost" size="icon" onClick={() => removeProduct(product.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
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
