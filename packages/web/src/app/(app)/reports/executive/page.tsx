import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { ExecutiveReportView } from "@/components/dashboard/reports/executive-report";
import { getAuthorizedDashboardData } from "@/lib/data";
import { requireAccess } from "@/lib/auth/access-context";
import { createClient } from "@/lib/supabase/server";
import type { ActionTask, ActionTaskEvent, ClientRiskOpportunity, ClientSuccessPlan } from "@/lib/types/database";
import { buildDataQualityPortfolio } from "@/services/data-quality";
import { buildExecutiveReport, normalizeExecutiveReportPeriod } from "@/services/executive-report";
import { todayInSaoPaulo } from "@/services/my-day";

export default async function ExecutiveReportPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireAccess("executive");
  const [supabase, { period: rawPeriod }, data] = await Promise.all([createClient(), searchParams, getAuthorizedDashboardData()]);
  const [tasksResult, eventsResult, portfolioResult, successPlansResult] = await Promise.all([
    supabase.from("action_tasks").select("*").order("updated_at", { ascending: false }).returns<ActionTask[]>(),
    supabase.from("action_task_events").select("*").order("created_at", { ascending: false }).returns<ActionTaskEvent[]>(),
    supabase.from("client_risk_opportunities").select("*").order("updated_at", { ascending: false }).returns<ClientRiskOpportunity[]>(),
    supabase.from("client_success_plans").select("*").returns<ClientSuccessPlan[]>(),
  ]);
  const today = todayInSaoPaulo();
  const tasks = tasksResult.data ?? [];
  const dataQuality = buildDataQualityPortfolio({
    clients: data.clients,
    interactions: data.interactions,
    stakeholders: data.stakeholders,
    successPlans: successPlansResult.data ?? [],
    tasks,
    commercialPlans: data.commercialPlans,
    clientProducts: data.clientProducts,
    clientProductOwners: data.clientProductOwners,
    referenceDate: today,
    staleAfterDays: data.scoreSettings.threshold_alerta_dias,
  });
  const report = buildExecutiveReport({
    clients: data.clients,
    interactions: data.interactions,
    portfolioItems: portfolioResult.data ?? [],
    commercialPlans: data.commercialPlans,
    tasks,
    events: eventsResult.data ?? [],
    managers: data.managers,
    healthScore: data.healthScore.score,
    dataQuality,
    referenceDate: today,
    generatedAt: new Date().toISOString(),
    periodDays: normalizeExecutiveReportPeriod(rawPeriod),
  });

  return (
    <div>
      <PageTopbar title="Relatório Executivo" description="Leitura periódica da execução, risco e resultado da carteira" />
      <div className="p-6 sm:p-8 print:p-0">
        <ExecutiveReportView report={report} />
      </div>
    </div>
  );
}
