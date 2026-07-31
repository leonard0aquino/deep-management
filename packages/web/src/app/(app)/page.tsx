import { getAuthorizedDashboardData, type DashboardData } from "@/lib/data";
import { requireAccess } from "@/lib/auth/access-context";
import type { RelationshipStatus } from "@/lib/types/database";
import { computeScoreTrend } from "@/services/health-score";
import { generateExecutiveBriefing, detectAtRiskClients } from "@/services/insights";
import { syncNotifications } from "@/services/notifications";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { NewInteractionButton } from "@/components/dashboard/executive/new-interaction-button";
import { DashboardFilters } from "@/components/dashboard/executive/dashboard-filters";
import { HealthScoreHero } from "@/components/dashboard/executive/health-score-hero";
import { MetricChips } from "@/components/dashboard/executive/metric-chips";
import { ExecutiveBriefing } from "@/components/dashboard/executive/executive-briefing";
import { HealthDistribution } from "@/components/dashboard/executive/health-distribution";
import { RelationshipHeatmap } from "@/components/dashboard/executive/relationship-heatmap";
import { RecentActivity } from "@/components/dashboard/executive/recent-activity";
import { PriorityActionCenter } from "@/components/dashboard/executive/priority-action-center";
import { generatePriorityActions } from "@/services/priority-actions";
import { ScoreExplainability } from "@/components/dashboard/executive/score-explainability";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { SavedDashboardViews } from "@/components/dashboard/executive/saved-dashboard-views";

type DashboardQuery = {
  period?: string | string[];
  client?: string | string[];
  product?: string | string[];
  manager?: string | string[];
  status?: string | string[];
  view?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function average(values: number[]) {
  return values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function filterDashboardData(data: DashboardData, query: DashboardQuery) {
  const period = Number(first(query.period));
  const clientId = first(query.client);
  const productId = first(query.product);
  const managerId = first(query.manager);
  const requestedStatus = first(query.status);
  const status = (["recente", "ok", "atencao", "alerta", "critico"] as string[]).includes(requestedStatus ?? "")
    ? (requestedStatus as RelationshipStatus)
    : undefined;
  const view = first(query.view);
  const cutoff = Number.isFinite(period) && period > 0 ? Date.now() - period * 86_400_000 : null;

  const riskClientIds = new Set(detectAtRiskClients(data.clientHealth).map((client) => client.client_id));
  const managerCombos = managerId
    ? new Set(
        data.interactions
          .filter((interaction) => interaction.manager_id === managerId)
          .map((interaction) => `${interaction.client_id}::${interaction.product_id}`),
      )
    : null;

  const filteredMatrix = data.matrix.filter((row) => {
    const combo = `${row.client_id}::${row.product_id}`;
    if (clientId && row.client_id !== clientId) return false;
    if (productId && row.product_id !== productId) return false;
    if (status && row.status !== status) return false;
    if (managerCombos && !managerCombos.has(combo)) return false;
    if (view === "risk" && !riskClientIds.has(row.client_id)) return false;
    if (view === "stale" && row.days_since_contact <= 30) return false;
    return true;
  });

  const visibleCombos = new Set(filteredMatrix.map((row) => `${row.client_id}::${row.product_id}`));
  const hasMatrixFilter = Boolean(clientId || productId || managerId || status || view);
  const filteredInteractions = data.interactions.filter((interaction) => {
    const combo = `${interaction.client_id}::${interaction.product_id}`;
    if (cutoff && new Date(interaction.occurred_at).getTime() < cutoff) return false;
    if (hasMatrixFilter && !visibleCombos.has(combo)) return false;
    return true;
  });

  const visibleClientIds = new Set(filteredMatrix.map((row) => row.client_id));
  const visibleProductIds = new Set(filteredMatrix.map((row) => row.product_id));
  const filteredClients = hasMatrixFilter
    ? data.clients.filter((client) => visibleClientIds.has(client.id))
    : data.clients;
  const filteredProducts = hasMatrixFilter
    ? data.products.filter((product) => visibleProductIds.has(product.id))
    : data.products;
  const filteredClientHealth = data.clientHealth.filter((client) =>
    hasMatrixFilter ? visibleClientIds.has(client.client_id) : true,
  );

  return {
    ...data,
    interactions: filteredInteractions,
    matrix: filteredMatrix,
    clients: filteredClients,
    products: filteredProducts,
    clientHealth: filteredClientHealth,
    healthScore: {
      score: average(filteredMatrix.map((row) => row.composite_score)),
      critical_count: filteredMatrix.filter((row) => row.status === "critico").length,
      tracked_combinations: filteredMatrix.length,
    },
  } satisfies DashboardData;
}

export default async function DashboardExecutivoPage({
  searchParams,
}: {
  searchParams: Promise<DashboardQuery>;
}) {
  const [data, supabase, query] = await Promise.all([getAuthorizedDashboardData(), createClient(), searchParams, requireAccess("executive")]);
  const filteredData = filterDashboardData(data, query);
  const filterQuery = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) => {
      const resolved = first(value);
      return resolved ? [[key, resolved]] : [];
    }),
  ).toString();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [savedViewsResult, decisionsResult, tasksResult, eventsResult, assignableUsersResult] = await Promise.all([
    user
      ? supabase.from("saved_dashboard_views").select("*").eq("user_id", user.id).order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from("action_decisions").select("*").eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from("action_tasks").select("*").order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from("action_task_events").select("*").order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    user
      ? supabase.rpc("get_assignable_action_users")
      : Promise.resolve({ data: [] }),
  ]);
  const savedViews = savedViewsResult.data ?? [];
  const decisions = decisionsResult.data ?? [];
  const actionTasks = tasksResult.data ?? [];
  const actionTaskEvents = eventsResult.data ?? [];
  const assignableUsers = assignableUsersResult.data ?? [];
  const defaultView = savedViews.find((view) => view.is_default);
  if (!filterQuery && defaultView && Object.keys(defaultView.filters).length > 0) {
    redirect(`/?${new URLSearchParams(defaultView.filters).toString()}`);
  }

  const trend = computeScoreTrend(filteredData.interactions, data.contacts, 8, data.scoreSettings);
  const briefing = generateExecutiveBriefing({
    interactions: filteredData.interactions,
    matrix: filteredData.matrix,
    clientHealth: filteredData.clientHealth,
    clients: filteredData.clients,
    products: filteredData.products,
    scoreSettings: data.scoreSettings,
  });
  const atRisk = detectAtRiskClients(filteredData.clientHealth);
  const actions = generatePriorityActions(filteredData.matrix, filteredData.interactions);

  after(async () => {
    await syncNotifications(supabase, briefing);
  });

  const averageAging = average(filteredData.matrix.map((row) => row.days_since_contact));
  const exportRows = filteredData.matrix.map((row) => ({
    Cliente: row.client_name,
    Produto: row.product_name,
    Status: row.status,
    Score: row.composite_score,
    "Dias sem contato": row.days_since_contact,
    Interações: row.interaction_count,
    "Relevância média": row.avg_relevance,
    "Último contato": row.last_contact,
  }));

  return (
    <div>
      <PageTopbar title="Cockpit Executivo">
        <NewInteractionButton data={data} />
      </PageTopbar>

      <div className="space-y-5 p-4 sm:p-6">
        <DashboardFilters clients={data.clients} products={data.products} managers={data.managers} />
        {user && <SavedDashboardViews initialViews={savedViews} userId={user.id} currentQuery={filterQuery} exportRows={exportRows} />}

        <MetricChips
          healthScore={filteredData.healthScore.score}
          atRiskCount={atRisk.length}
          criticalCount={filteredData.healthScore.critical_count}
          averageAging={averageAging}
          interactionsCount={filteredData.interactions.length}
          filterQuery={filterQuery}
          targetScore={Number(data.scoreSettings.target_score)}
        />

        {user && (
          <PriorityActionCenter
            actions={actions}
            decisions={decisions}
            tasks={actionTasks}
            events={actionTaskEvents}
            users={assignableUsers}
            userId={user.id}
            data={data}
          />
        )}

        <div id="health-score" className="grid scroll-mt-4 items-stretch gap-5 xl:grid-cols-2">
          <HealthScoreHero score={filteredData.healthScore.score} trend={trend} criticalCount={filteredData.healthScore.critical_count} targetScore={Number(data.scoreSettings.target_score)} />
          <HealthDistribution matrix={filteredData.matrix} />
        </div>
        <ScoreExplainability matrix={filteredData.matrix} interactions={filteredData.interactions} settings={data.scoreSettings} />
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <ExecutiveBriefing items={briefing} userEmail={user?.email ?? ""} />
          <div id="recent-activity" className="scroll-mt-4">
            <RecentActivity data={filteredData} />
          </div>
        </div>
        <div id="relationship-map" className="scroll-mt-4">
          <RelationshipHeatmap
            clients={filteredData.clients}
            products={filteredData.products}
            matrix={filteredData.matrix}
            interactions={filteredData.interactions}
          />
        </div>
      </div>
    </div>
  );
}
