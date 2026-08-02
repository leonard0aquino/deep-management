import { Clock3, TrendingUp } from "lucide-react";
import { getAuthorizedDashboardData } from "@/lib/data";
import { computeScoreTrend } from "@/services/health-score";
import {
  groupHealthByProduct,
  groupHealthByClient,
  groupHealthByManager,
  countInteractionsByType,
  topTopics,
  averageDaysSinceContact,
  averageScoreComponents,
} from "@/services/analytics";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { HorizontalBarChart } from "@/components/dashboard/analytics/horizontal-bar-chart";
import { InteractionTypeChart } from "@/components/dashboard/analytics/interaction-type-chart";
import { TopicsChart } from "@/components/dashboard/analytics/topics-chart";
import { ScoreRadarChart } from "@/components/dashboard/analytics/score-radar-chart";
import { StatIndicator } from "@/components/dashboard/analytics/stat-indicator";
import { HealthScoreHero } from "@/components/dashboard/executive/health-score-hero";
import { RenewalPortfolio } from "@/components/dashboard/analytics/renewal-portfolio";
import { buildRenewalPortfolioSummary } from "@/services/renewal-expansion";
import { todayInSaoPaulo } from "@/services/my-day";
import { requireAccess } from "@/lib/auth/access-context";
import { createClient } from "@/lib/supabase/server";
import type { ActionTask, ActionTaskEvent, ClientSuccessPlan } from "@/lib/types/database";
import { buildManagementDashboard } from "@/services/management-dashboard";
import { ManagementDashboard } from "@/components/dashboard/analytics/management-dashboard";
import { buildDataQualityPortfolio } from "@/services/data-quality";
import { DataQualityDashboard } from "@/components/dashboard/analytics/data-quality-dashboard";

export default async function AnalyticsPage() {
  await requireAccess("executive");
  const [supabase, data] = await Promise.all([createClient(), getAuthorizedDashboardData()]);
  const [tasksResult, eventsResult, successPlansResult] = await Promise.all([
    supabase.from("action_tasks").select("*").order("updated_at", { ascending: false }).returns<ActionTask[]>(),
    supabase.from("action_task_events").select("*").order("created_at", { ascending: false }).returns<ActionTaskEvent[]>(),
    supabase.from("client_success_plans").select("*").returns<ClientSuccessPlan[]>(),
  ]);
  const today = todayInSaoPaulo();
  const management = buildManagementDashboard({
    clients: data.clients,
    managers: data.managers,
    interactions: data.interactions,
    tasks: tasksResult.data ?? [],
    events: eventsResult.data ?? [],
    stakeholders: data.stakeholders,
    commercialPlans: data.commercialPlans,
    clientProducts: data.clientProducts,
    clientProductOwners: data.clientProductOwners,
    referenceDate: today,
  });
  const dataQuality = buildDataQualityPortfolio({
    clients: data.clients,
    interactions: data.interactions,
    stakeholders: data.stakeholders,
    successPlans: successPlansResult.data ?? [],
    tasks: tasksResult.data ?? [],
    commercialPlans: data.commercialPlans,
    clientProducts: data.clientProducts,
    clientProductOwners: data.clientProductOwners,
    referenceDate: today,
    staleAfterDays: data.scoreSettings.threshold_alerta_dias,
  });

  const trend = computeScoreTrend(data.interactions, data.contacts, 12, data.scoreSettings);
  const byProduct = groupHealthByProduct(data.matrix);
  const byClient = groupHealthByClient(data.matrix);
  const byManager = groupHealthByManager(data.matrix, data.interactions);
  const byType = countInteractionsByType(data.interactions);
  const topics = topTopics(data.interactions);
  const avgDays = averageDaysSinceContact(data.matrix);
  const radar = averageScoreComponents(data.matrix);
  const trendDelta = (trend[trend.length - 1]?.score ?? 0) - (trend[0]?.score ?? 0);
  const renewalSummary = buildRenewalPortfolioSummary(data.clients, data.commercialPlans, today);

  return (
    <div>
      <PageTopbar title="Dashboard de Gestão" description="Execução, risco e resultado da carteira AISphere" />
      <div className="space-y-5 p-6 sm:p-8">
        <ManagementDashboard summary={management} />

        <DataQualityDashboard summary={dataQuality} />

        <HealthScoreHero
          score={Math.min(100, Math.max(0, data.healthScore.score))}
          trend={trend}
          criticalCount={data.healthScore.critical_count}
          targetScore={Number(data.scoreSettings.target_score)}
        />

        <RenewalPortfolio summary={renewalSummary} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatIndicator
            label="Tempo médio sem interação"
            value={`${avgDays}d`}
            hint="média entre todas as combinações cliente x produto"
            icon={Clock3}
          />
          <StatIndicator
            label="Evolução em 12 semanas"
            value={`${trendDelta >= 0 ? "+" : ""}${trendDelta} pts`}
            hint="variação do Health Score geral"
            icon={TrendingUp}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <HorizontalBarChart title="Health por Produto" data={byProduct} />
          <HorizontalBarChart title="Health por Cliente" data={byClient} />
          <HorizontalBarChart
            title="Health por Executivo"
            description="Atribuído ao gestor mais frequente em cada combinação"
            data={byManager}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <InteractionTypeChart data={byType} />
          <TopicsChart data={topics} />
          <ScoreRadarChart data={radar} />
        </div>
      </div>
    </div>
  );
}
