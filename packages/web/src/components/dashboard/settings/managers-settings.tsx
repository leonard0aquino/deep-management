"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, UserPlus, Link2, Link2Off, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { revalidateDashboardCache } from "@/lib/actions/revalidate-dashboard";
import { inviteManagerAsUser } from "@/app/(app)/admin/actions";
import type { DeepManager, UserProfile } from "@/lib/types/database";

type ActionMode = { managerId: string; mode: "invite" | "link" | "edit" } | null;

export function ManagersSettings({ managers, users }: { managers: DeepManager[]; users: UserProfile[] }) {
  const router = useRouter();
  const [list, setList] = useState(managers);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [action, setAction] = useState<ActionMode>(null);
  const [inviteEmailDraft, setInviteEmailDraft] = useState("");
  const [linkUserDraft, setLinkUserDraft] = useState("");
  const [editNameDraft, setEditNameDraft] = useState("");
  const [editEmailDraft, setEditEmailDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  const linkedUserIds = new Set(list.map((m) => m.linked_user_id).filter(Boolean));
  const usersById = new Map(users.map((u) => [u.id, u]));

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
    await revalidateDashboardCache();
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
    setAction({ managerId: manager.id, mode: "invite" });
    setInviteEmailDraft(manager.email ?? "");
  }

  function startLink(manager: DeepManager) {
    setError(null);
    setAction({ managerId: manager.id, mode: "link" });
    setLinkUserDraft("");
  }

  function startEdit(manager: DeepManager) {
    setError(null);
    setAction({ managerId: manager.id, mode: "edit" });
    setEditNameDraft(manager.name);
    setEditEmailDraft(manager.email ?? "");
  }

  async function confirmEdit(manager: DeepManager) {
    const name = editNameDraft.trim();
    if (!name) return;
    const email = editEmailDraft.trim() || null;
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("deep_managers")
      .update({ name, email })
      .eq("id", manager.id);
    if (dbError) {
      setError(`Não foi possível salvar as alterações de "${manager.name}": ${dbError.message}`);
      return;
    }
    setList((prev) => prev.map((m) => (m.id === manager.id ? { ...m, name, email } : m)));
    setAction(null);
    await revalidateDashboardCache();
    router.refresh();
  }

  function confirmInvite(manager: DeepManager) {
    const email = inviteEmailDraft.trim();
    if (!email) return;
    startTransition(async () => {
      const result = await inviteManagerAsUser(manager.id, email, manager.name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setList((prev) => prev.map((m) => (m.id === manager.id ? { ...m, email } : m)));
      setAction(null);
      router.refresh();
    });
  }

  async function confirmLink(manager: DeepManager) {
    if (!linkUserDraft) return;
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("deep_managers")
      .update({ linked_user_id: linkUserDraft })
      .eq("id", manager.id);
    if (dbError) {
      setError(`Não foi possível vincular "${manager.name}": ${dbError.message}`);
      return;
    }
    setList((prev) => prev.map((m) => (m.id === manager.id ? { ...m, linked_user_id: linkUserDraft } : m)));
    setAction(null);
    await revalidateDashboardCache();
    router.refresh();
  }

  async function unlink(manager: DeepManager) {
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("deep_managers")
      .update({ linked_user_id: null })
      .eq("id", manager.id);
    if (dbError) {
      setError(`Não foi possível desvincular "${manager.name}": ${dbError.message}`);
      return;
    }
    setList((prev) => prev.map((m) => (m.id === manager.id ? { ...m, linked_user_id: null } : m)));
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestores</CardTitle>
        <CardDescription>Responsáveis DEEP atribuíveis a interações. Vincule a um Usuário existente ou convide um login novo (papel Gerente).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        {list.map((manager) => {
          const linkedUser = manager.linked_user_id ? usersById.get(manager.linked_user_id) : null;
          const availableUsers = users.filter((u) => u.id === manager.linked_user_id || !linkedUserIds.has(u.id));
          return (
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
                      Vinculado a {linkedUser?.name ?? "usuário"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Sem login</Badge>
                  )}
                  <Switch checked={manager.active} onCheckedChange={() => toggleActive(manager)} />
                  {action?.managerId !== manager.id && (
                    <Button variant="ghost" size="icon" onClick={() => startEdit(manager)} aria-label={`Editar ${manager.name}`} title="Editar">
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                  {manager.linked_user_id ? (
                    <Button variant="ghost" size="icon" onClick={() => unlink(manager)} aria-label={`Desvincular ${manager.name}`} title="Desvincular usuário">
                      <Link2Off className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  ) : (
                    action?.managerId !== manager.id && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => startLink(manager)} aria-label={`Vincular ${manager.name} a usuário existente`} title="Vincular a usuário existente">
                          <Link2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => startInvite(manager)} aria-label={`Convidar ${manager.name} como usuário`} title="Convidar como usuário novo">
                          <UserPlus className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </>
                    )
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
              {action?.managerId === manager.id && action.mode === "edit" && (
                <div className="flex gap-2 border-t pt-2">
                  <Input
                    placeholder="Nome"
                    value={editNameDraft}
                    onChange={(e) => setEditNameDraft(e.target.value)}
                    className="h-8"
                    aria-label={`Nome de ${manager.name}`}
                  />
                  <Input
                    type="email"
                    placeholder="email@empresa.com"
                    value={editEmailDraft}
                    onChange={(e) => setEditEmailDraft(e.target.value)}
                    className="h-8"
                    aria-label={`E-mail de ${manager.name}`}
                  />
                  <Button size="sm" onClick={() => confirmEdit(manager)} disabled={!editNameDraft.trim()}>Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAction(null)}>Cancelar</Button>
                </div>
              )}
              {action?.managerId === manager.id && action.mode === "invite" && (
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
                  <Button size="sm" variant="ghost" onClick={() => setAction(null)}>Cancelar</Button>
                </div>
              )}
              {action?.managerId === manager.id && action.mode === "link" && (
                <div className="flex gap-2 border-t pt-2">
                  <Select value={linkUserDraft} onValueChange={(value) => value && setLinkUserDraft(value)}>
                    <SelectTrigger size="sm" aria-label={`Usuário para vincular a ${manager.name}`} className="h-8 flex-1">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.length === 0 && (
                        <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum usuário disponível</p>
                      )}
                      {availableUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name ?? u.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => confirmLink(manager)} disabled={!linkUserDraft}>Vincular</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAction(null)}>Cancelar</Button>
                </div>
              )}
            </div>
          );
        })}
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
