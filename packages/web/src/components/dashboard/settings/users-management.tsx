"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { inviteUser } from "@/app/(app)/admin/actions";
import type { UserProfile, UserRole } from "@/lib/types/database";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  executivo: "Executivo",
  gerente: "Gerente",
  analista: "Analista",
};

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  admin: "bg-violet-100 text-violet-700 border-violet-200",
  executivo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  gerente: "bg-blue-100 text-blue-700 border-blue-200",
  analista: "",
};

const ROLE_DESCRIPTION: Record<UserRole, string> = {
  admin: "Acesso total, inclui Configurações",
  executivo: "Visões estratégicas e carteira completa",
  gerente: "Gerencia clientes, produtos, pessoas e interações",
  analista: "Leitura + registra interações, sem editar cadastros",
};

export function UsersManagement({ profiles }: { profiles: UserProfile[]; viewerRole: UserRole }) {
  const router = useRouter();
  const [list, setList] = useState(profiles);
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const assignableRoles = Object.keys(ROLE_LABEL) as UserRole[];

  async function changeRole(profile: UserProfile, role: UserRole) {
    if (role === profile.role) return;
    setRoleError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("user_profiles")
      .update({ role })
      .eq("id", profile.id);
    if (dbError) {
      setRoleError(`Não foi possível atualizar o papel de ${profile.name ?? "usuário"}: ${dbError.message}`);
      return;
    }
    setList((prev) => prev.map((p) => (p.id === profile.id ? { ...p, role } : p)));
    router.refresh();
  }

  function handleInvite() {
    setError(null);
    setInvited(false);
    startTransition(async () => {
      const result = await inviteUser(email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInvited(true);
      setEmail("");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários</CardTitle>
        <CardDescription>Admin: acesso total. Executivo: visão estratégica. Gerente e Analista: carteira atribuída.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {roleError && <p className="text-sm text-red-600" role="alert">{roleError}</p>}
        {list.map((profile) => (
          <div key={profile.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
            <p className="truncate text-sm font-medium">{profile.name}</p>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className={ROLE_BADGE_CLASS[profile.role]}>
                {ROLE_LABEL[profile.role]}
              </Badge>
              <Select value={profile.role} onValueChange={(value) => value && changeRole(profile, value as UserRole)}>
                  <SelectTrigger size="sm" aria-label={`Papel de ${profile.name ?? "usuário"}`} className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        <span className="flex flex-col">
                          <span>{ROLE_LABEL[role]}</span>
                          <span className="text-xs text-muted-foreground">{ROLE_DESCRIPTION[role]}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
            </div>
          </div>
        ))}

        <div className="flex gap-2 pt-2">
          <Input
            type="email"
            placeholder="email@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={handleInvite} disabled={isPending || !email} className="shrink-0">
            {isPending ? "Convidando..." : "Convidar"}
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {invited && <p className="text-sm text-emerald-600">Convite enviado com sucesso.</p>}
      </CardContent>
    </Card>
  );
}
