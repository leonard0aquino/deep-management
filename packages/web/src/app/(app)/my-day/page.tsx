import { redirect } from "next/navigation";
import { MyDayDashboard } from "@/components/dashboard/my-day/my-day-dashboard";
import { NewInteractionButton } from "@/components/dashboard/executive/new-interaction-button";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { getAuthorizedDashboardData } from "@/lib/data";
import { requireAccess } from "@/lib/auth/access-context";
import { parseLocalDate } from "@/lib/local-date";
import { createClient } from "@/lib/supabase/server";
import type { ActionTask, Notification } from "@/lib/types/database";
import { buildMyDaySummary, todayInSaoPaulo } from "@/services/my-day";

export default async function MyDayPage() {
  const [data, supabase] = await Promise.all([getAuthorizedDashboardData(), createClient(), requireAccess("operations")]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [tasksResult, notificationsResult] = await Promise.all([
    supabase
      .from("action_tasks")
      .select("*")
      .eq("assigned_to", user.id)
      .order("due_date", { ascending: true })
      .returns<ActionTask[]>(),
    supabase
      .from("notifications")
      .select("*")
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<Notification[]>(),
  ]);
  const today = todayInSaoPaulo();
  const summary = buildMyDaySummary({
    userId: user.id,
    today,
    tasks: tasksResult.data ?? [],
    notifications: notificationsResult.data ?? [],
    data,
  });
  const formattedToday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(parseLocalDate(today));

  return (
    <div>
      <PageTopbar title="Meu dia" description={`Prioridades e contexto de ${formattedToday}`}>
        <NewInteractionButton data={data} />
      </PageTopbar>
      <main className="p-4 sm:p-6">
        <MyDayDashboard summary={summary} />
      </main>
    </div>
  );
}
