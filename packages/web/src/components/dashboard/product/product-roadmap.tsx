"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ProductRoadmapItem, RoadmapStatus } from "@/lib/types/database";

const STATUS_CONFIG: Record<RoadmapStatus, { label: string; badge: string }> = {
  planejado: { label: "Planejado", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  em_andamento: { label: "Em andamento", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  concluido: { label: "Concluído", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export function ProductRoadmap({
  productId,
  items,
}: {
  productId: string;
  items: ProductRoadmapItem[];
}) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function addItem() {
    if (!title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_roadmap_items")
      .insert({ product_id: productId, title: title.trim(), status: "planejado" })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setList((prev) => [data, ...prev]);
      setTitle("");
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roadmap</CardTitle>
        <CardDescription>Próximos passos planejados para este produto</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum item de roadmap ainda.</p>
        )}
        {list.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
            <span>{item.title}</span>
            <Badge variant="outline" className={STATUS_CONFIG[item.status].badge}>
              {STATUS_CONFIG[item.status].label}
            </Badge>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Input
            placeholder="Novo item de roadmap"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <Button size="icon" onClick={addItem} disabled={saving || !title.trim()} className="shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
