"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { inviteUser } from "@/app/(app)/admin/actions";
import type { UserProfile } from "@/lib/types/database";

export function UsersManagement({ profiles }: { profiles: UserProfile[] }) {
  const router = useRouter();
  const [list, setList] = useState(profiles);
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);

  async function toggleRole(profile: UserProfile) {
    const supabase = createClient();
    const newRole = profile.role === "admin" ? "member" : "admin";
    const { error: dbError } = await supabase
      .from("user_profiles")
      .update({ role: newRole })
      .eq("id", profile.id);
    if (!dbError) {
      setList((prev) => prev.map((p) => (p.id === profile.id ? { ...p, role: newRole } : p)));
      router.refresh();
    }
  }

  function handleInvite() {
    setError(null);
    setInvited(false);
    startTransition(async () => {
      try {
        await inviteUser(email);
        setInvited(true);
        setEmail("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao convidar usuário.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários</CardTitle>
        <CardDescription>Papéis de acesso — admins gerenciam o Admin Center, members usam o dia a dia</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.map((profile) => (
          <div key={profile.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
            <p className="truncate text-sm font-medium">{profile.name}</p>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className={profile.role === "admin" ? "bg-violet-100 text-violet-700 border-violet-200" : ""}>
                {profile.role === "admin" ? "Admin" : "Member"}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => toggleRole(profile)}>
                Tornar {profile.role === "admin" ? "member" : "admin"}
              </Button>
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
