import { notFound } from "next/navigation";
import { getDashboardData } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ActionTask, ClientCommercialPlan, ClientRiskOpportunity, ClientSuccessMilestone, ClientSuccessPlan, UserProfile } from "@/lib/types/database";
import { generateClientBriefing, clientPendingActions, clientNextSteps } from "@/services/client-insights";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { ClientHeader } from "@/components/dashboard/client/client-header";
import { ClientBriefing } from "@/components/dashboard/client/client-briefing";
import { ClientProducts } from "@/components/dashboard/client/client-products";
import { ClientStakeholders } from "@/components/dashboard/client/client-stakeholders";
import { ClientCadences } from "@/components/dashboard/client/client-cadences";
import { ClientPending } from "@/components/dashboard/client/client-pending";
import { ClientFiles } from "@/components/dashboard/client/client-files";
import { Timeline } from "@/components/dashboard/client/timeline";
import { ClientSuccessPlanSection } from "@/components/dashboard/client/client-success-plan";
import { ClientRiskOpportunitiesSection } from "@/components/dashboard/client/client-risk-opportunities";
import { ClientCommercialPlanSection } from "@/components/dashboard/client/client-commercial-plan";
import { ClientDataQuality } from "@/components/dashboard/client/client-data-quality";
import { buildClientDataQuality } from "@/services/data-quality";
import { todayInSaoPaulo } from "@/services/my-day";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getDashboardData();
  const supabase = await createClient();

  const client = data.clients.find((c) => c.id === id);
  if (!client) notFound();

  const health = data.clientHealth.find((h) => h.client_id === id);
  const clientMatrix = data.matrix.filter((m) => m.client_id === id);
  const clientInteractions = data.interactions.filter((i) => i.client_id === id);
  const clientStakeholders = data.stakeholders.filter((s) => s.client_id === id);
  const owner = data.managers.find((manager) => manager.id === client.owner_manager_id);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [profileResult, planResult, riskOpportunitiesResult, commercialPlanResult, tasksResult] = await Promise.all([
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
      .from("client_risk_opportunities")
      .select("*")
      .eq("client_id", id)
      .returns<ClientRiskOpportunity[]>(),
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
  const milestonesResult = planResult.data
    ? await supabase
        .from("client_success_milestones")
        .select("*")
        .eq("plan_id", planResult.data.id)
        .order("target_date")
        .returns<ClientSuccessMilestone[]>()
    : { data: [] as ClientSuccessMilestone[] };
  const canManage = profileResult.data?.role === "admin" || profileResult.data?.role === "gerente";

  const briefing = generateClientBriefing({
    client,
    clientMatrix,
    clientInteractions,
    allMatrix: data.matrix,
    products: data.products,
  });
  const pending = clientPendingActions(clientMatrix);
  const nextSteps = clientNextSteps(clientMatrix);
  const dataQuality = buildClientDataQuality({
    client,
    interactions: clientInteractions,
    stakeholders: clientStakeholders,
    successPlans: planResult.data ? [planResult.data] : [],
    tasks: tasksResult.data ?? [],
    commercialPlans: commercialPlanResult.data ? [commercialPlanResult.data] : [],
    referenceDate: todayInSaoPaulo(),
    staleAfterDays: data.scoreSettings.threshold_alerta_dias,
  });

  return (
    <div>
      <PageTopbar title={client.name} description="Visão 360° do relacionamento" />
      <div className="space-y-5 p-6 sm:p-8">
        <ClientHeader client={client} health={health} owner={owner} />
        <ClientDataQuality report={dataQuality} />
        <ClientBriefing items={briefing} />
        <ClientSuccessPlanSection
          clientId={client.id}
          defaultOwnerManagerId={client.owner_manager_id}
          plan={planResult.data ?? null}
          milestones={milestonesResult.data ?? []}
          managers={data.managers}
          canManage={canManage}
        />
        <ClientRiskOpportunitiesSection
          clientId={client.id}
          defaultOwnerManagerId={client.owner_manager_id}
          items={riskOpportunitiesResult.data ?? []}
          managers={data.managers}
          canManage={canManage}
        />
        <ClientCommercialPlanSection
          client={client}
          plan={commercialPlanResult.data ?? null}
          managers={data.managers}
          canManage={canManage}
        />
        <ClientProducts rows={clientMatrix} />
        <ClientStakeholders
          stakeholders={clientStakeholders}
          contacts={data.contacts.filter((contact) => contact.client_id === client.id)}
          managers={data.managers}
          canManage={canManage}
        />
        <ClientCadences
          clientId={client.id}
          cadences={data.cadences.filter((cadence) => cadence.client_id === client.id)}
          playbooks={data.playbooks}
          playbookSteps={data.playbookSteps}
          products={data.products}
          managers={data.managers}
          canManage={canManage}
        />
        <ClientPending pending={pending} nextSteps={nextSteps} />
        <Timeline interactions={clientInteractions} data={data} />
        <ClientFiles interactions={clientInteractions} />
      </div>
    </div>
  );
}
