import { createClient } from "@/lib/supabase/server";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManagersSettings } from "@/components/dashboard/settings/managers-settings";
import { ProductsSettings } from "@/components/dashboard/settings/products-settings";
import { HealthScoreWeightsForm } from "@/components/dashboard/settings/health-score-weights-form";
import { UserProfileCard } from "@/components/dashboard/settings/user-profile-card";
import { UsersManagement } from "@/components/dashboard/settings/users-management";
import { ApiKeysManagement } from "@/components/dashboard/settings/api-keys-management";
import { AuditLogView } from "@/components/dashboard/settings/audit-log-view";
import { GovernancePanel } from "@/components/dashboard/settings/governance-panel";
import type {
  ApiKey,
  AuditLogEntry,
  DeepManager,
  HealthScoreSettings,
  Product,
  Client,
  UserProfile,
} from "@/lib/types/database";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myProfile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  const myRole = myProfile?.role;
  const isAdmin = myRole === "admin";
  const isGerente = myRole === "gerente";

  if (!isAdmin && !isGerente) {
    return (
      <div>
        <PageTopbar title="Configurações" description="Perfil" />
        <div className="p-6 sm:p-8">
          <UserProfileCard email={user?.email ?? ""} />
        </div>
      </div>
    );
  }

  const [managersResult, productsResult, settingsResult, profilesResult, apiKeysResult, auditResult, clientsResult, interactionClientsResult] =
    await Promise.all([
      supabase.from("deep_managers").select("*").order("name").returns<DeepManager[]>(),
      supabase.from("products").select("*").order("name").returns<Product[]>(),
      supabase.from("health_score_settings").select("*").single<HealthScoreSettings>(),
      supabase.from("user_profiles").select("*").order("name").returns<UserProfile[]>(),
      isAdmin
        ? supabase.from("api_keys").select("*").order("created_at", { ascending: false }).returns<ApiKey[]>()
        : Promise.resolve({ data: [] as ApiKey[] }),
      isAdmin
        ? supabase.rpc("get_audit_log", { p_limit: 30 })
        : Promise.resolve({ data: [] as AuditLogEntry[] }),
      supabase.from("clients").select("*").order("name").returns<Client[]>(),
      supabase.from("interactions").select("client_id").returns<Array<{ client_id: string }>>(),
    ]);

  const settings = settingsResult.data ? {
    ...settingsResult.data,
    target_score: Number(settingsResult.data.target_score ?? 85),
  } : {
    id: true,
    target_score: 85,
    weight_recency: 0.35,
    weight_frequency: 0.25,
    weight_relevance: 0.2,
    weight_participation: 0.1,
    weight_diversity: 0.1,
    threshold_recente_dias: 7,
    threshold_ok_dias: 21,
    threshold_atencao_dias: 45,
    threshold_alerta_dias: 90,
    updated_at: new Date().toISOString(),
  };

  return (
    <div>
      <PageTopbar
        title="Configurações"
        description={isAdmin ? "Usuários, governança, API e auditoria" : "Usuários, produtos e governança"}
      />
      <div className="p-6 sm:p-8">
        <Tabs defaultValue="users">
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="catalog">Produtos & Gestores</TabsTrigger>
            <TabsTrigger value="score">Health Score</TabsTrigger>
            <TabsTrigger value="governance">Governança</TabsTrigger>
            {isAdmin && <TabsTrigger value="api">API</TabsTrigger>}
            {isAdmin && <TabsTrigger value="audit">Auditoria</TabsTrigger>}
            <TabsTrigger value="profile">Perfil</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="pt-4">
            <UsersManagement profiles={profilesResult.data ?? []} viewerRole={myRole ?? "analista"} />
          </TabsContent>

          <TabsContent value="catalog" className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-2">
            <ManagersSettings managers={managersResult.data ?? []} users={profilesResult.data ?? []} />
            <ProductsSettings products={productsResult.data ?? []} />
          </TabsContent>

          <TabsContent value="score" className="pt-4">
            <HealthScoreWeightsForm settings={settings} readOnly={!isAdmin} />
          </TabsContent>

          <TabsContent value="governance" className="pt-4">
            <GovernancePanel clients={clientsResult.data ?? []} interactions={interactionClientsResult.data ?? []} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="api" className="pt-4">
              <ApiKeysManagement apiKeys={apiKeysResult.data ?? []} />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="audit" className="pt-4">
              <AuditLogView initialEntries={auditResult.data ?? []} profiles={profilesResult.data ?? []} />
            </TabsContent>
          )}

          <TabsContent value="profile" className="pt-4">
            <UserProfileCard email={user?.email ?? ""} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
