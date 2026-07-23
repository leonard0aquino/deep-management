"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { inviteManagerAsUser } from "@/app/(app)/admin/actions";
import type { DeepManager } from "@/lib/types/database";

export function ManagersSettings({ managers }: { managers: DeepManager[] }) {
  const router = useRouter();
  const [list, setList] = useState(managers);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteEmailDraft, setInviteEmailDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  async function addManager() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("deep_managers")
      .insert({ name })
      .select()
      .single();
    setSaving(false);
    if (dbError) {
      setError(`Não foi possível adicionar o gestor: ${dbError.message}`);
      return;
    }
    if (data) {
      setList((prev) => [...prev, data]);
      setNewName("");
    }
  }

  async function toggleActive(manager: DeepManager) {
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("deep_managers")
      .update({ active: !manager.active })
      .eq("id", manager.id);
    if (dbError) {
      setError(`Não foi possível atualizar "${manager.name}": ${dbError.message}`);
      return;
    }
    setList((prev) => prev.map((m) => (m.id === manager.id ? { ...m, active: !m.active } : m)));
    router.refresh();
  }

  async function removeManager(manager: DeepManager) {
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("deep_managers").delete().eq("id", manager.id);
    if (dbError) {
      setError(`Não foi possível excluir "${manager.name}": ${dbError.message}`);
      setConfirmingDelete(null);
      return;
    }
    setList((prev) => prev.filter((m) => m.id !== manager.id));
    setConfirmingDelete(null);
  }

  function startInvite(manager: DeepManager) {
    setError(null);
    setInvitingId(manager.id);
    setInviteEmailDraft(manager.email ?? "");
  }

  function confirmInvite(manager: DeepManager) {
    const email = inviteEmailDraft.trim();
    if (!email) return;
    startTransition(async () => {
      try {
        await inviteManagerAsUser(manager.id, email, manager.name);
        setList((prev) => prev.map((m) => (m.id === manager.id ? { ...m, email } : m)));
        setInvitingId(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao convidar gestor como usuário.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestores</CardTitle>
        <CardDescription>Responsáveis DEEP atribuíveis a interações. Convide como Usuário para dar acesso de login (papel Gerente).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        {list.map((manager) => (
          <div key={manager.id} className="space-y-2 rounded-lg border p-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`truncate text-sm font-medium ${!manager.active ? "text-muted-foreground line-through" : ""}`}>
                  {manager.name}
                </p>
                {manager.email && <p className="truncate text-xs text-muted-foreground">{manager.email}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {manager.linked_user_id ? (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-700">
                    Conta vinculada
                  </Badge>
                ) : (
                  <Badge variant="outline">Sem login</Badge>
                )}
                <Switch checked={manager.active} onCheckedChange={() => toggleActive(manager)} />
                {!manager.linked_user_id && invitingId !== manager.id && (
                  <Button variant="ghost" size="icon" onClick={() => startInvite(manager)} aria-label={`Convidar ${manager.name} como usuário`} title="Convidar como usuário">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
                {confirmingDelete === manager.id ? (
                  <>
                    <Button variant="destructive" size="sm" onClick={() => removeManager(manager)}>Confirmar</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(null)}>Cancelar</Button>
                  </>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => setConfirmingDelete(manager.id)} aria-label={`Excluir ${manager.name}`}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>
            {invitingId === manager.id && (
              <div className="flex gap-2 border-t pt-2">
                <Input
                  type="email"
                  placeholder="email@empresa.com"
                  value={inviteEmailDraft}
                  onChange={(e) => setInviteEmailDraft(e.target.value)}
                  className="h-8"
                />
                <Button size="sm" onClick={() => confirmInvite(manager)} disabled={isPending || !inviteEmailDraft.trim()}>
                  {isPending ? "Convidando..." : "Enviar convite"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setInvitingId(null)}>Cancelar</Button>
              </div>
            )}
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
