import type { AccessContext } from "@/lib/auth/access-context";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Client, ClientContact, ClientProduct, ClientProductOwner, CommercialOpportunity, CommercialOpportunityStageEvent, DeepManager, InteractionView, Product, UserProfile } from "@/lib/types/database";

export async function getCommercialData(context: AccessContext) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const [opportunities, events, interactions, clients, products, managers, profiles, contacts, clientProducts, clientProductOwners] = await Promise.all([
    supabase.from("commercial_opportunities").select("*").order("updated_at", { ascending: false }).returns<CommercialOpportunity[]>(),
    supabase.from("commercial_opportunity_stage_events").select("*").order("created_at", { ascending: false }).returns<CommercialOpportunityStageEvent[]>(),
    supabase.from("interactions_view").select("*").eq("business_area", "commercial").order("occurred_at", { ascending: false }).returns<InteractionView[]>(),
    supabase.from("clients").select("*").eq("active", true).order("name").returns<Client[]>(),
    supabase.from("products").select("*").eq("active", true).order("name").returns<Product[]>(),
    supabase.from("deep_managers").select("*").eq("active", true).order("name").returns<DeepManager[]>(),
    admin.from("user_profiles").select("*").eq("business_area", "commercial").returns<UserProfile[]>(),
    supabase.from("client_contacts").select("*").order("name").returns<ClientContact[]>(),
    supabase.from("client_products").select("*").eq("active", true).returns<ClientProduct[]>(),
    supabase.from("client_product_owners").select("*").eq("active", true).returns<ClientProductOwner[]>(),
  ]);
  const transverse = context.role === "admin" || context.role === "executivo";
  const commercialUsers = new Set((profiles.data ?? []).map((profile) => profile.id));
  const visibleManagers = (managers.data ?? []).filter((manager) => manager.linked_user_id && commercialUsers.has(manager.linked_user_id) && (transverse || context.managerIds.includes(manager.id)));
  const visibleManagerIds = new Set(visibleManagers.map((manager) => manager.id));
  const visibleInteractions = (interactions.data ?? []).filter((interaction) => transverse || (interaction.manager_id && visibleManagerIds.has(interaction.manager_id)));

  return {
    opportunities: opportunities.data ?? [],
    events: events.data ?? [],
    interactions: visibleInteractions,
    clients: clients.data ?? [],
    products: products.data ?? [],
    managers: visibleManagers,
    contacts: contacts.data ?? [],
    clientProducts: clientProducts.data ?? [],
    clientProductOwners: clientProductOwners.data ?? [],
  };
}
