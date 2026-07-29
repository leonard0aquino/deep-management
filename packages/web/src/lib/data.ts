import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ClientHealth,
  ClientProductMatrixRow,
  Client,
  ClientContact,
  ClientProduct,
  ClientCommercialPlan,
  ClientCadenceProgress,
  CustomerPlaybook,
  CustomerPlaybookStep,
  DeepManager,
  HealthScore,
  InteractionView,
  Product,
  StakeholderHealth,
  HealthScoreSettings,
} from "@/lib/types/database";

async function fetchDashboardData() {
  const supabase = createAdminClient();

  const [
    interactions,
    matrix,
    healthScore,
    clientHealth,
    stakeholders,
    clients,
    products,
    managers,
    contacts,
    clientProducts,
    scoreSettings,
    commercialPlans,
    playbooks,
    playbookSteps,
    cadences,
  ] = await Promise.all([
    supabase
      .from("interactions_view")
      .select("*")
      .order("occurred_at", { ascending: false })
      .returns<InteractionView[]>(),
    supabase.from("client_product_matrix").select("*").returns<ClientProductMatrixRow[]>(),
    supabase.from("health_score").select("*").single<HealthScore>(),
    supabase.from("client_health").select("*").returns<ClientHealth[]>(),
    supabase.from("stakeholder_health").select("*").returns<StakeholderHealth[]>(),
    supabase.from("clients").select("*").eq("active", true).order("name").returns<Client[]>(),
    supabase.from("products").select("*").eq("active", true).order("name").returns<Product[]>(),
    supabase
      .from("deep_managers")
      .select("*")
      .eq("active", true)
      .order("name")
      .returns<DeepManager[]>(),
    supabase.from("client_contacts").select("*").order("name").returns<ClientContact[]>(),
    supabase.from("client_products").select("*").eq("active", true).returns<ClientProduct[]>(),
    supabase.from("health_score_settings").select("*").single<HealthScoreSettings>(),
    supabase.from("client_commercial_plans").select("*").returns<ClientCommercialPlan[]>(),
    supabase.from("customer_playbooks").select("*").order("name").returns<CustomerPlaybook[]>(),
    supabase.from("customer_playbook_steps").select("*").order("position").returns<CustomerPlaybookStep[]>(),
    supabase.from("client_cadence_progress").select("*").order("created_at", { ascending: false }).returns<ClientCadenceProgress[]>(),
  ]);

  return {
    interactions: interactions.data ?? [],
    matrix: matrix.data ?? [],
    healthScore: healthScore.data ?? { score: 0, critical_count: 0, tracked_combinations: 0 },
    clientHealth: clientHealth.data ?? [],
    stakeholders: stakeholders.data ?? [],
    clients: clients.data ?? [],
    products: products.data ?? [],
    managers: managers.data ?? [],
    contacts: contacts.data ?? [],
    clientProducts: clientProducts.data ?? [],
    scoreSettings: scoreSettings.data ? {
      ...scoreSettings.data,
      target_score: Number(scoreSettings.data.target_score ?? 85),
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
    },
    commercialPlans: commercialPlans.data ?? [],
    playbooks: playbooks.data ?? [],
    playbookSteps: playbookSteps.data ?? [],
    cadences: cadences.data ?? [],
  };
}

export const getDashboardData = unstable_cache(fetchDashboardData, ["dashboard-data"], {
  revalidate: 20,
});

export type DashboardData = Awaited<ReturnType<typeof fetchDashboardData>>;
