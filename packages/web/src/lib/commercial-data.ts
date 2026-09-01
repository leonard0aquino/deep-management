import type { AccessContext } from "@/lib/auth/access-context";
import { hierarchyUserIds } from "@/lib/auth/user-hierarchy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Client, CommercialAgendaEntry, CommercialCockpitState, CommercialDailyProspecting, CommercialOpportunity, CommercialOpportunityStageEvent, CommercialUserStageScope, UserProfile } from "@/lib/types/database";

export async function getCommercialData(context: AccessContext) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const [states, agendaEntries, dailyProspecting, opportunities, opportunityEvents, clients, profiles, stageScopes] = await Promise.all([
    supabase
      .from("commercial_cockpit_states")
      .select("*")
      .order("updated_at", { ascending: false })
      .returns<CommercialCockpitState[]>(),
    supabase
      .from("commercial_agenda_entries")
      .select("*")
      .order("scheduled_at")
      .returns<CommercialAgendaEntry[]>(),
    supabase
      .from("commercial_daily_prospecting")
      .select("*")
      .order("activity_on")
      .returns<CommercialDailyProspecting[]>(),
    supabase
      .from("commercial_opportunities")
      .select("*")
      .returns<CommercialOpportunity[]>(),
    supabase
      .from("commercial_opportunity_stage_events")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<CommercialOpportunityStageEvent[]>(),
    supabase
      .from("clients")
      .select("id,name")
      .returns<Array<Pick<Client, "id" | "name">>>(),
    admin
      .from("user_profiles")
      .select("*")
      .or("business_area.eq.commercial,commercial_access.eq.true")
      .order("name")
      .returns<UserProfile[]>(),
    supabase
      .from("commercial_user_stage_scopes")
      .select("*")
      .returns<CommercialUserStageScope[]>(),
  ]);

  if (states.error || agendaEntries.error || dailyProspecting.error || opportunities.error || opportunityEvents.error || clients.error || profiles.error || stageScopes.error) {
    throw new Error("Não foi possível carregar o cockpit Comercial manual.");
  }

  const commercialProfiles = profiles.data ?? [];
  const transverse = context.role === "admin" || context.role === "executivo";
  const visibleIds = transverse
    ? new Set(commercialProfiles.map((profile) => profile.id))
    : hierarchyUserIds(context.userId, commercialProfiles);
  const users = commercialProfiles
    .filter((profile) => visibleIds.has(profile.id))
    .map(({ id, name, role }) => {
      const userScopes = (stageScopes.data ?? []).filter((scope) => scope.owner_user_id === id);
      return {
        id,
        name,
        role,
        stages: userScopes.filter((scope) => scope.active).map((scope) => scope.stage),
        scopeUpdatedAt: userScopes.map((scope) => scope.updated_at).sort().at(-1),
      };
    });

  return {
    states: (states.data ?? []).filter((state) => visibleIds.has(state.owner_user_id)),
    agendaEntries: (agendaEntries.data ?? []).filter((entry) => visibleIds.has(entry.owner_user_id)),
    dailyProspecting: (dailyProspecting.data ?? []).filter((entry) => visibleIds.has(entry.owner_user_id)),
    opportunities: opportunities.data ?? [],
    opportunityEvents: opportunityEvents.data ?? [],
    clients: clients.data ?? [],
    users,
    currentUserId: context.userId,
  };
}
