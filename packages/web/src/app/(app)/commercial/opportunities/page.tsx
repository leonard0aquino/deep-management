import { CommercialOpportunities } from "@/components/dashboard/commercial/commercial-opportunities";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { requireAccess } from "@/lib/auth/access-context";
import { canManageOperations } from "@/lib/auth/access-control";
import { hierarchyUserIds } from "@/lib/auth/user-hierarchy";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Client, ClientContact, CommercialOpportunity, CommercialOpportunityStageEvent, DeepManager, Product, UserProfile } from "@/lib/types/database";

export default async function CommercialOpportunitiesPage() {
  const context = await requireAccess("commercial");
  const supabase = await createClient();
  const admin = createAdminClient();
  const [opportunities, events, clients, contacts, products, managers, profiles, authResult] = await Promise.all([
    supabase.from("commercial_opportunities").select("*").order("updated_at", { ascending: false }).returns<CommercialOpportunity[]>(),
    supabase.from("commercial_opportunity_stage_events").select("*").order("created_at", { ascending: false }).limit(50).returns<CommercialOpportunityStageEvent[]>(),
    supabase.from("clients").select("*").order("name").returns<Client[]>(),
    supabase.from("client_contacts").select("*").order("name").returns<ClientContact[]>(),
    supabase.from("products").select("*").order("name").returns<Product[]>(),
    supabase.from("deep_managers").select("*").eq("active", true).order("name").returns<DeepManager[]>(),
    admin.from("user_profiles").select("*").or("business_area.eq.commercial,commercial_access.eq.true").returns<UserProfile[]>(),
    supabase.auth.getUser(),
  ]);
  const profileRows = profiles.data ?? [];
  const transverse = context.role === "admin" || context.role === "executivo";
  const visibleUserIds = transverse
    ? new Set(profileRows.map((profile) => profile.id))
    : hierarchyUserIds(context.userId, profileRows);
  const visibleProfiles = profileRows.filter((profile) => visibleUserIds.has(profile.id));
  const commercialUsers = new Set(visibleProfiles.map((profile) => profile.id));
  const currentProfile = visibleProfiles.find((profile) => profile.id === context.userId);
  const authenticatedUser = authResult.data.user;
  const currentUserName = (typeof authenticatedUser?.user_metadata?.name === "string" ? authenticatedUser.user_metadata.name : null)
    ?? (typeof authenticatedUser?.user_metadata?.full_name === "string" ? authenticatedUser.user_metadata.full_name : null)
    ?? currentProfile?.name
    ?? authenticatedUser?.email
    ?? context.userId;
  const currentManager = currentProfile
    ? (managers.data ?? []).find((manager) => manager.linked_user_id === context.userId) ?? null
    : null;
  const visibleManagers = (managers.data ?? []).filter((manager) =>
    manager.linked_user_id
    && commercialUsers.has(manager.linked_user_id)
    && ((context.role === "admin" || context.role === "executivo") || context.managerIds.includes(manager.id)),
  );

  return <div><PageTopbar title="Funil Comercial" description="Oportunidades, etapas e próximos passos com histórico auditável" /><div className="p-6 sm:p-8"><CommercialOpportunities opportunities={opportunities.data ?? []} events={events.data ?? []} clients={clients.data ?? []} contacts={contacts.data ?? []} products={products.data ?? []} managers={visibleManagers} users={visibleProfiles.map(({ id, name }) => ({ id, name }))} currentManager={currentManager} currentUserName={currentUserName} isCommercialUser={Boolean(currentProfile)} canManageProspects={canManageOperations(context.role)} /></div></div>;
}
