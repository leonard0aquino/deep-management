import { notFound } from "next/navigation";
import { getAuthorizedDashboardData } from "@/lib/data";
import { requireAccess } from "@/lib/auth/access-context";
import { createClient } from "@/lib/supabase/server";
import type { ActionTask, ClientCommercialPlan, ClientSuccessPlan, UserProfile } from "@/lib/types/database";
import { generateClientBriefing } from "@/services/client-insights";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { ClientHeader } from "@/components/dashboard/client/client-header";
import { ClientBriefing } from "@/components/dashboard/client/client-briefing";
import { ClientProducts } from "@/components/dashboard/client/client-products";
import { ClientStakeholders } from "@/components/dashboard/client/client-stakeholders";
import { Timeline } from "@/components/dashboard/client/timeline";
import { ClientDataQuality } from "@/components/dashboard/client/client-data-quality";
import { buildClientDataQuality } from "@/services/data-quality";
import { todayInSaoPaulo } from "@/services/my-day";
import { canManageOperations } from "@/lib/auth/access-control";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, context] = await Promise.all([getAuthorizedDashboardData(), requireAccess("portfolio")]);
  const supabase = await createClient();

  const client = data.clients.find((c) => c.id === id);
  if (!client) notFound();

  const health = data.clientHealth.find((h) => h.client_id === id);
  const clientMatrix = data.matrix.filter((m) => m.client_id === id);
  const clientInteractions = data.interactions.filter((i) => i.client_id === id);
  const clientStakeholders = data.stakeholders.filter((s) => s.client_id === id);
  const clientProductAssignments = data.clientProducts.filter((assignment) => assignment.client_id === id);
  const assignmentIds = new Set(clientProductAssignments.map((assignment) => assignment.id));
  const clientProductOwners = data.clientProductOwners.filter(
    (owner) => owner.active && assignmentIds.has(owner.client_product_id),
  );
  const ownerIds = new Set(clientProductOwners.map((owner) => owner.manager_id));
  const assignedProductIds = new Set(clientProductOwners.map((owner) => owner.client_product_id));
  const unassignedProductCount = clientProductAssignments.filter(
    (assignment) => !assignedProductIds.has(assignment.id),
  ).length;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [profileResult, planResult, commercialPlanResult, tasksResult] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user?.id ?? "")
      .maybeSingle<UserProfile>(),
    supabase
      .from("client_success_plans")
      .select("*")
      .eq("client_id", id)
      .maybeSingle<ClientSuccessPlan>(),
    supabase
      .from("client_commercial_plans")
      .select("*")
      .eq("client_id", id)
      .maybeSingle<ClientCommercialPlan>(),
    supabase
      .from("action_tasks")
      .select("*")
      .eq("client_id", id)
      .returns<ActionTask[]>(),
  ]);
  const canManage = profileResult.data ? canManageOperations(profileResult.data.role) : false;

  const briefing = generateClientBriefing({
    client,
    clientMatrix,
    clientInteractions,
    allMatrix: data.matrix,
    products: data.products,
  });
  const dataQuality = buildClientDataQuality({
    client,
    interactions: clientInteractions,
    stakeholders: clientStakeholders,
    successPlans: planResult.data ? [planResult.data] : [],
    tasks: tasksResult.data ?? [],
    commercialPlans: commercialPlanResult.data ? [commercialPlanResult.data] : [],
    clientProducts: clientProductAssignments,
    clientProductOwners,
    referenceDate: todayInSaoPaulo(),
    staleAfterDays: data.scoreSettings.threshold_alerta_dias,
  });

  return (
    <div>
      <PageTopbar title={client.name} description="Visão 360° do relacionamento" />
      <div className="space-y-5 p-6 sm:p-8">
        <ClientHeader client={client} health={health} ownerCount={ownerIds.size} unassignedProductCount={unassignedProductCount} />
        <Timeline interactions={clientInteractions} data={data} editableInteractionIds={clientInteractions.filter((item) => canManageOperations(context.role) || item.created_by === context.userId).map((item) => item.id)} />
        <ClientDataQuality report={dataQuality} />
        <ClientBriefing items={briefing} />
        <ClientProducts
          assignments={clientProductAssignments}
          owners={clientProductOwners}
          rows={clientMatrix}
          products={data.products}
          managers={data.managers}
          canManage={canManage}
        />
        <ClientStakeholders
          stakeholders={clientStakeholders}
          contacts={data.contacts.filter((contact) => contact.client_id === client.id)}
          managers={data.managers}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
