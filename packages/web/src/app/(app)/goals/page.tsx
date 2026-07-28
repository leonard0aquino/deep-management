import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { InternalGoalsDashboard } from "@/components/dashboard/goals/internal-goals-dashboard";
import { getDashboardData } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ActionTask, ActionTaskEvent, ClientRiskOpportunity, ClientSuccessPlan, InternalGoal, Notification, UserRole } from "@/lib/types/database";
import { buildInternalGoals, DEFAULT_INTERNAL_GOALS } from "@/services/internal-goals";

export default async function GoalsPage() {
  const [data, supabase] = await Promise.all([getDashboardData(), createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  const [tasks, events, risks, notifications, successPlans, goals, profile] = await Promise.all([
    supabase.from("action_tasks").select("*").returns<ActionTask[]>(),
    supabase.from("action_task_events").select("*").returns<ActionTaskEvent[]>(),
    supabase.from("client_risk_opportunities").select("*").returns<ClientRiskOpportunity[]>(),
    supabase.from("notifications").select("*").returns<Notification[]>(),
    supabase.from("client_success_plans").select("*").returns<ClientSuccessPlan[]>(),
    supabase.from("internal_goals").select("*").returns<InternalGoal[]>(),
    supabase.from("user_profiles").select("role").eq("id", user?.id ?? "").single<Pick<{ role: UserRole }, "role">>(),
  ]);
  const referenceAt = new Date().toISOString();
  const summary = buildInternalGoals({
    clients: data.clients,
    interactions: data.interactions,
    tasks: tasks.data ?? [],
    events: events.data ?? [],
    stakeholders: data.stakeholders,
    risks: risks.data ?? [],
    notifications: notifications.data ?? [],
    successPlans: successPlans.data ?? [],
    goals: goals.data?.length === 6 ? goals.data : DEFAULT_INTERNAL_GOALS,
    referenceAt,
    staleAfterDays: data.scoreSettings.threshold_alerta_dias,
  });
  const generatedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(referenceAt));

  return (
    <div>
      <PageTopbar title="Metas internas" description="Compromissos de execução e resultado da carteira AISphere" />
      <div className="p-6 sm:p-8">
        <InternalGoalsDashboard initialResults={summary.results} currentRiskClients={summary.currentRiskClients} canEdit={profile.data?.role === "admin" || profile.data?.role === "gerente"} generatedAt={generatedAt} />
      </div>
    </div>
  );
}
