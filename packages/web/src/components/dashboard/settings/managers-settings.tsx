"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { DeepManager } from "@/lib/types/database";

export function ManagersSettings({ managers }: { managers: DeepManager[] }) {
  const router = useRouter();
  const [list, setList] = useState(managers);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  async function addManager() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("deep_managers")
      .insert({ name })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setList((prev) => [...prev, data]);
      setNewName("");
    }
  }

  async function toggleActive(manager: DeepManager) {
    const supabase = createClient();
    const { error } = await supabase
      .from("deep_managers")
      .update({ active: !manager.active })
      .eq("id", manager.id);
    if (!error) {
      setList((prev) => prev.map((m) => (m.id === manager.id ? { ...m, active: !m.active } : m)));
      router.refresh();
    }
  }

  async function removeManager(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("deep_managers").delete().eq("id", id);
    if (!error) setList((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestores</CardTitle>
        <CardDescription>Responsáveis DEEP disponíveis para atribuir a interações</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.map((manager) => (
          <div key={manager.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
            <div className="min-w-0">
              <p className={`truncate text-sm font-medium ${!manager.active ? "text-muted-foreground line-through" : ""}`}>
                {manager.name}
              </p>
              {manager.email && <p className="truncate text-xs text-muted-foreground">{manager.email}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Switch checked={manager.active} onCheckedChange={() => toggleActive(manager)} />
              <Button variant="ghost" size="icon" onClick={() => removeManager(manager.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <Input
            placeholder="Nome do novo gestor"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addManager()}
          />
          <Button onClick={addManager} disabled={saving || !newName.trim()} className="shrink-0 gap-1.5">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
