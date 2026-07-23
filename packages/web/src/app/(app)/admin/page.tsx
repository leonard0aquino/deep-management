import { ShieldAlert } from "lucide-react";
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
import { IntegrationsShell } from "@/components/dashboard/settings/integrations-shell";
import type {
  ApiKey,
  AuditLog,
  DeepManager,
  HealthScoreSettings,
  Product,
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

  if (myProfile?.role !== "admin") {
    return (
      <div>
        <PageTopbar title="Configurações" description="Acesso restrito" />
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium">Esta área é restrita a administradores.</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Fale com um admin do time para solicitar acesso.
          </p>
        </div>
      </div>
    );
  }

  const [managersResult, productsResult, settingsResult, profilesResult, apiKeysResult, auditResult] =
    await Promise.all([
      supabase.from("deep_managers").select("*").order("name").returns<DeepManager[]>(),
      supabase.from("products").select("*").order("name").returns<Product[]>(),
      supabase.from("health_score_settings").select("*").single<HealthScoreSettings>(),
      supabase.from("user_profiles").select("*").order("name").returns<UserProfile[]>(),
      supabase.from("api_keys").select("*").order("created_at", { ascending: false }).returns<ApiKey[]>(),
      supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30)
        .returns<AuditLog[]>(),
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
    updated_at: new Date().toISOString(),
  };

  return (
    <div>
      <PageTopbar title="Configurações" description="Usuários, produtos, API e auditoria" />
      <div className="p-6 sm:p-8">
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="catalog">Produtos & Gestores</TabsTrigger>
            <TabsTrigger value="score">Health Score</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="audit">Auditoria</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="pt-4">
            <UsersManagement profiles={profilesResult.data ?? []} />
          </TabsContent>

          <TabsContent value="catalog" className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-2">
            <ManagersSettings managers={managersResult.data ?? []} />
            <ProductsSettings products={productsResult.data ?? []} />
          </TabsContent>

          <TabsContent value="score" className="pt-4">
            <HealthScoreWeightsForm settings={settings} />
          </TabsContent>

          <TabsContent value="api" className="pt-4">
            <ApiKeysManagement apiKeys={apiKeysResult.data ?? []} />
          </TabsContent>

          <TabsContent value="audit" className="pt-4">
            <AuditLogView entries={auditResult.data ?? []} />
          </TabsContent>

          <TabsContent value="integrations" className="pt-4">
            <IntegrationsShell />
          </TabsContent>

          <TabsContent value="profile" className="pt-4">
            <UserProfileCard email={user?.email ?? ""} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
