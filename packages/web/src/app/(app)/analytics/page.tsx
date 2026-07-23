import { Clock3, TrendingUp } from "lucide-react";
import { getDashboardData } from "@/lib/data";
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

export default async function AnalyticsPage() {
  const data = await getDashboardData();

  const trend = computeScoreTrend(data.interactions, data.contacts, 12, data.scoreSettings);
  const byProduct = groupHealthByProduct(data.matrix);
  const byClient = groupHealthByClient(data.matrix);
  const byManager = groupHealthByManager(data.matrix, data.interactions);
  const byType = countInteractionsByType(data.interactions);
  const topics = topTopics(data.interactions);
  const avgDays = averageDaysSinceContact(data.matrix);
  const radar = averageScoreComponents(data.matrix);
  const trendDelta = (trend[trend.length - 1]?.score ?? 0) - (trend[0]?.score ?? 0);

  return (
    <div>
      <PageTopbar title="Dashboards" description="Visões executivas de saúde e evolução" />
      <div className="space-y-5 p-6 sm:p-8">
        <HealthScoreHero
          score={data.healthScore.score}
          trend={trend}
          criticalCount={data.healthScore.critical_count}
          targetScore={Number(data.scoreSettings.target_score)}
        />

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
