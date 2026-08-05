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
import type { BusinessArea, CommercialCockpitStage, CommercialUserStageScope, UserProfile, UserRole } from "@/lib/types/database";
import { ALLOWED_MANAGER_ROLES, leaderCandidates } from "@/lib/auth/user-hierarchy";
import { COMMERCIAL_COCKPIT_STAGE_LABEL, COMMERCIAL_COCKPIT_STAGES } from "@/services/commercial-dashboard";

const UNASSIGNED = "__unassigned__";

const BUSINESS_AREA_LABEL: Record<BusinessArea, string> = {
  customer_success: "Customer Success",
  commercial: "Comercial",
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  executivo: "Executivo",
  gerente: "Gerente",
  supervisor: "Supervisor",
  analista: "Analista",
};

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  admin: "bg-violet-100 text-violet-700 border-violet-200",
  executivo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  gerente: "bg-blue-100 text-blue-700 border-blue-200",
  supervisor: "bg-amber-100 text-amber-700 border-amber-200",
  analista: "",
};

const ROLE_DESCRIPTION: Record<UserRole, string> = {
  admin: "Acesso total, inclui Configurações",
  executivo: "Visões estratégicas e carteira completa",
  gerente: "Opera a carteira dos Supervisores e Analistas da estrutura",
  supervisor: "Opera a própria carteira e a dos Analistas da estrutura",
  analista: "Leitura + registra interações, sem editar cadastros",
};

export function UsersManagement({ profiles, commercialStageScopes }: { profiles: UserProfile[]; commercialStageScopes: CommercialUserStageScope[]; viewerRole: UserRole }) {
  const router = useRouter();
  const [list, setList] = useState(profiles);
  const [stageScopes, setStageScopes] = useState(commercialStageScopes);
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
      .update({ role, manager_user_id: null })
      .eq("id", profile.id);
    if (dbError) {
      setRoleError(`Não foi possível atualizar o papel de ${profile.name ?? "usuário"}: ${dbError.message}`);
      return;
    }
    setList((prev) => prev.map((p) => (p.id === profile.id ? { ...p, role, manager_user_id: null } : p)));
    router.refresh();
  }

  async function changeLeader(profile: UserProfile, managerUserId: string | null) {
    if (managerUserId === profile.manager_user_id) return;
    setRoleError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("user_profiles")
      .update({ manager_user_id: managerUserId })
      .eq("id", profile.id);
    if (dbError) {
      setRoleError(`Não foi possível atualizar o líder de ${profile.name ?? "usuário"}: ${dbError.message}`);
      return;
    }
    setList((prev) => prev.map((p) => (p.id === profile.id ? { ...p, manager_user_id: managerUserId } : p)));
    router.refresh();
  }

  async function changeBusinessArea(profile: UserProfile, businessArea: BusinessArea) {
    if (businessArea === profile.business_area) return;
    setRoleError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("user_profiles")
      .update({ business_area: businessArea })
      .eq("id", profile.id);
    if (dbError) {
      setRoleError(`Não foi possível atualizar a área de ${profile.name ?? "usuário"}: ${dbError.message}`);
      return;
    }
    setList((prev) => prev.map((p) => (p.id === profile.id ? { ...p, business_area: businessArea } : p)));
    setStageScopes((prev) => {
      const otherUsers = prev.filter((scope) => scope.owner_user_id !== profile.id);
      const existing = prev.filter((scope) => scope.owner_user_id === profile.id);
      const nextUserScopes = COMMERCIAL_COCKPIT_STAGES.map((stage) => {
        const scope = existing.find((item) => item.stage === stage);
        return scope
          ? { ...scope, active: businessArea === "commercial" }
          : {
            id: `${profile.id}:${stage}`,
            owner_user_id: profile.id,
            stage,
            active: businessArea === "commercial",
            created_by: "",
            updated_by: "",
            created_at: "",
            updated_at: "",
          };
      });
      return [...otherUsers, ...nextUserScopes];
    });
    router.refresh();
  }

  async function toggleCommercialStage(profile: UserProfile, stage: CommercialCockpitStage, active: boolean) {
    setRoleError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("commercial_user_stage_scopes")
      .upsert({ owner_user_id: profile.id, stage, active }, { onConflict: "owner_user_id,stage" });
    if (dbError) {
      setRoleError(`Não foi possível atualizar ${COMMERCIAL_COCKPIT_STAGE_LABEL[stage]} de ${profile.name ?? "usuário"}: ${dbError.message}`);
      return;
    }
    setStageScopes((prev) => {
      const existing = prev.find((scope) => scope.owner_user_id === profile.id && scope.stage === stage);
      if (existing) return prev.map((scope) => scope === existing ? { ...scope, active } : scope);
      return [...prev, {
        id: `${profile.id}:${stage}`,
        owner_user_id: profile.id,
        stage,
        active,
        created_by: "",
        updated_by: "",
        created_at: "",
        updated_at: "",
      }];
    });
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
        <CardDescription>Hierarquia: Executivo → Gerente → Supervisor → Analista. Admin permanece fora da cadeia.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {roleError && <p className="text-sm text-red-600" role="alert">{roleError}</p>}
        {list.map((profile) => {
          const candidates = leaderCandidates(profile, list);
          const selectedLeader = list.find((item) => item.id === profile.manager_user_id);
          const allowedLeaderRoles = ALLOWED_MANAGER_ROLES[profile.role];
          const missingLeaderLabel = allowedLeaderRoles.map((role) => ROLE_LABEL[role]).join(" ou ");

          return (
          <div key={profile.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-2.5">
            <div className="min-w-36 flex-1">
              <p className="truncate text-sm font-medium">{profile.name}</p>
              <p className="text-xs text-muted-foreground">
                {profile.manager_user_id
                  ? `Líder: ${list.find((item) => item.id === profile.manager_user_id)?.name ?? "Usuário não encontrado"}`
                  : ALLOWED_MANAGER_ROLES[profile.role].length > 0
                    ? "Líder não definido"
                    : "Fora da cadeia de liderança"}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
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
              <Select
                value={profile.business_area}
                onValueChange={(value) => value && changeBusinessArea(profile, value as BusinessArea)}
              >
                <SelectTrigger size="sm" aria-label={`Área de ${profile.name ?? "usuário"}`} className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(BUSINESS_AREA_LABEL) as BusinessArea[]).map((area) => (
                    <SelectItem key={area} value={area}>{BUSINESS_AREA_LABEL[area]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {ALLOWED_MANAGER_ROLES[profile.role].length > 0 ? (
                <Select
                  value={profile.manager_user_id ?? UNASSIGNED}
                  onValueChange={(value) => changeLeader(profile, value === UNASSIGNED ? null : value)}
                >
                  <SelectTrigger size="sm" aria-label={`Líder de ${profile.name ?? "usuário"}`} className="w-44">
                    <span className="flex flex-1 text-left">{selectedLeader?.name ?? "Não definido"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Não definido</SelectItem>
                    {candidates.map((leader) => (
                      <SelectItem key={leader.id} value={leader.id}>{leader.name ?? "Sem nome"}</SelectItem>
                    ))}
                    {candidates.length === 0 && allowedLeaderRoles.length > 0 && (
                      <SelectItem value={`__missing_${allowedLeaderRoles.join("_")}__`} disabled>
                        Nenhum {missingLeaderLabel} disponível
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <span className="w-44 text-center text-xs text-muted-foreground">Sem líder direto</span>
              )}
            </div>
            {profile.business_area === "commercial" && (
              <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-t pt-2">
                <span className="text-xs font-medium text-muted-foreground">Etapas Comerciais</span>
                {COMMERCIAL_COCKPIT_STAGES.map((stage) => {
                  const checked = stageScopes.some((scope) => scope.owner_user_id === profile.id && scope.stage === stage && scope.active);
                  return <label key={stage} className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => toggleCommercialStage(profile, stage, event.target.checked)}
                      aria-label={`${COMMERCIAL_COCKPIT_STAGE_LABEL[stage]} de ${profile.name ?? "usuário"}`}
                    />
                    {COMMERCIAL_COCKPIT_STAGE_LABEL[stage]}
                  </label>;
                })}
              </div>
            )}
          </div>
          );
        })}

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
