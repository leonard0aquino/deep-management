import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CalendarCheck2,
  CalendarClock,
  Clock3,
  MessageSquare,
  RefreshCcw,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { parseLocalDate } from "@/lib/local-date";
import type { ActionTask, Notification } from "@/lib/types/database";
import type { MyDaySummary } from "@/services/my-day";

const TASK_STATUS = {
  pending: "Pendente",
  in_progress: "Em andamento",
  postponed: "Adiada",
  completed: "Concluída",
  dismissed: "Dispensada",
} as const;

const NOTIFICATION_TONE: Record<Notification["severity"], string> = {
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-red-200 bg-red-50 text-red-700",
  opportunity: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const NOTIFICATION_LABEL: Record<Notification["severity"], string> = {
  info: "Informação",
  warning: "Atenção",
  critical: "Crítica",
  opportunity: "Oportunidade",
};

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", options ?? { day: "2-digit", month: "short" }).format(parseLocalDate(value));
}

function TaskItems({ items, overdue = false }: { items: ActionTask[]; overdue?: boolean }) {
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={overdue ? CalendarCheck2 : Clock3}
        title={overdue ? "Nenhuma tarefa atrasada" : "Nenhuma tarefa para hoje"}
        description={overdue ? "Você está em dia com os prazos assumidos." : "Novas tarefas com prazo hoje aparecerão aqui."}
      />
    );
  }

  return (
    <ul className="divide-y" aria-label={overdue ? "Tarefas atrasadas" : "Tarefas para hoje"}>
      {items.map((task) => (
        <li key={task.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={task.priority === "alta" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                {task.priority === "alta" ? "Alta" : "Média"}
              </Badge>
              <Badge variant="outline">{TASK_STATUS[task.status]}</Badge>
              <p className="truncate text-[12px] font-medium">{task.client_name} · {task.product_name}</p>
            </div>
            <p className={`mt-1.5 text-[11px] ${overdue ? "font-medium text-red-700" : "text-muted-foreground"}`}>
              {overdue ? `Venceu em ${formatDate(task.due_date)}` : "Prazo hoje"}
            </p>
          </div>
          <Link href={`/accounts/${task.client_id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Abrir cliente
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SectionHeader({ title, description, href, hrefLabel }: { title: string; description: string; href?: string; hrefLabel?: string }) {
  return (
    <CardHeader className="border-b pb-4">
      <CardTitle className="text-[13px]"><h2>{title}</h2></CardTitle>
      <CardDescription className="text-[11px]">{description}</CardDescription>
      {href && hrefLabel && (
        <CardAction>
          <Link href={href} className={buttonVariants({ variant: "ghost", size: "sm" })}>{hrefLabel}</Link>
        </CardAction>
      )}
    </CardHeader>
  );
}

export function MyDayDashboard({ summary }: { summary: MyDaySummary }) {
  const metrics = [
    { label: "Para hoje", value: summary.tasksToday.length, icon: CalendarCheck2, tone: "text-blue-700 bg-blue-50" },
    { label: "Atrasadas", value: summary.overdueTasks.length, icon: AlertTriangle, tone: "text-red-700 bg-red-50" },
    { label: "Reuniões a preparar", value: summary.meetingsToPrepare.length, icon: CalendarClock, tone: "text-violet-700 bg-violet-50" },
    { label: "Renovações em 90 dias", value: summary.upcomingRenewals.length, icon: RefreshCcw, tone: "text-amber-700 bg-amber-50" },
    { label: "Não lidas", value: summary.unreadNotifications.length, icon: Bell, tone: "text-slate-700 bg-slate-100" },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-white px-4 py-3 text-[12px] text-muted-foreground" role="status">
        {summary.scope === "personal"
          ? <>Carteira pessoal baseada nas interações de <strong className="text-foreground">{summary.manager?.name}</strong>.</>
          : <>Nenhum executivo está vinculado ao seu usuário. Exibindo a <strong className="text-foreground">visão geral da operação</strong>.</>}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Resumo do dia">
        {metrics.map((metric) => (
          <Card key={metric.label} size="sm" className="shadow-none">
            <CardContent className="flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold tabular-nums">{metric.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{metric.label}</p>
              </div>
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${metric.tone}`}>
                <metric.icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-2" aria-label="Prioridades imediatas">
        <Card className="shadow-none">
          <SectionHeader title="Minhas ações para hoje" description="Compromissos atribuídos a você com prazo hoje" href="/#priority-actions" hrefLabel="Central de Ações" />
          <CardContent><TaskItems items={summary.tasksToday} /></CardContent>
        </Card>
        <Card className={summary.overdueTasks.length > 0 ? "ring-red-200 shadow-none" : "shadow-none"}>
          <SectionHeader title="Ações atrasadas" description="Priorize estes compromissos antes de assumir novos" href="/#priority-actions" hrefLabel="Tratar atrasos" />
          <CardContent><TaskItems items={summary.overdueTasks} overdue /></CardContent>
        </Card>
      </section>

      <section className="grid items-start gap-5 lg:grid-cols-3" aria-label="Contexto da carteira">
        <Card className="shadow-none">
          <SectionHeader title="Reuniões a preparar" description="Hoje e próximos sete dias" href="/activity" hrefLabel="Ver agenda" />
          <CardContent>
            {summary.meetingsToPrepare.length === 0 ? (
              <EmptyState compact icon={CalendarClock} title="Nenhuma reunião próxima" description="Reuniões registradas para os próximos dias aparecerão aqui." />
            ) : (
              <ul className="space-y-1">
                {summary.meetingsToPrepare.slice(0, 6).map((meeting) => (
                  <li key={meeting.id}>
                    <Link href={`/accounts/${meeting.client_id}`} className="block rounded-lg px-2 py-2 text-[12px] transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="font-medium">{meeting.client_name} · {meeting.product_name}</span>
                      <span className="mt-1 block truncate text-[11px] text-muted-foreground">{formatDate(meeting.occurred_at, { weekday: "short", day: "2-digit", month: "short" })} · {meeting.topic}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <SectionHeader title="Renovações próximas" description="Contratos nos próximos 90 dias" href="/accounts" hrefLabel="Ver carteira" />
          <CardContent>
            {summary.upcomingRenewals.length === 0 ? (
              <EmptyState compact icon={RefreshCcw} title="Nenhuma renovação próxima" description="Contratos dentro da janela de 90 dias aparecerão aqui." />
            ) : (
              <ul className="space-y-1">
                {summary.upcomingRenewals.slice(0, 6).map((client) => (
                  <li key={client.id}>
                    <Link href={`/accounts/${client.id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-[12px] transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="truncate font-medium">{client.name}</span>
                      <Badge variant="outline" className="shrink-0">{client.daysRemaining === 0 ? "Hoje" : `${client.daysRemaining} dias`}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <SectionHeader title="Clientes sem contato" description="Mais de 30 dias sem interação" href="/?view=stale#relationship-map" hrefLabel="Ver mapa" />
          <CardContent>
            {summary.staleClients.length === 0 ? (
              <EmptyState compact icon={UsersRound} title="Carteira em dia" description="Nenhum cliente ultrapassou 30 dias sem contato." />
            ) : (
              <ul className="space-y-1">
                {summary.staleClients.slice(0, 6).map((client) => (
                  <li key={client.client_id}>
                    <Link href={`/accounts/${client.client_id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-[12px] transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="truncate font-medium">{client.client_name}</span>
                      <Badge variant="outline" className="shrink-0 border-amber-200 bg-amber-50 text-amber-700">{client.days_since_last_contact} dias</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-2" aria-label="Atualizações da carteira">
        <Card className="shadow-none">
          <SectionHeader title="Notificações não lidas" description="Alertas que ainda precisam da sua atenção" />
          <CardContent>
            {summary.unreadNotifications.length === 0 ? (
              <EmptyState compact icon={Bell} title="Tudo lido" description="Você não possui notificações pendentes." />
            ) : (
              <ul className="space-y-1">
                {summary.unreadNotifications.map((notification) => {
                  const content = (
                    <>
                      <Badge variant="outline" className={NOTIFICATION_TONE[notification.severity]}>{NOTIFICATION_LABEL[notification.severity]}</Badge>
                      <span className="truncate text-[12px] font-medium">{notification.title}</span>
                    </>
                  );
                  return (
                    <li key={notification.id}>
                      {notification.href ? (
                        <Link href={notification.href} className="flex items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</Link>
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg px-2 py-2">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <SectionHeader title="Interações recentes da carteira" description="Últimos registros até hoje" href="/activity" hrefLabel="Ver atividade" />
          <CardContent>
            {summary.recentInteractions.length === 0 ? (
              <EmptyState compact icon={MessageSquare} title="Nenhuma interação recente" description="Registre uma interação para iniciar a memória da carteira." />
            ) : (
              <ul className="space-y-1">
                {summary.recentInteractions.map((interaction) => (
                  <li key={interaction.id}>
                    <Link href={`/accounts/${interaction.client_id}`} className="block rounded-lg px-2 py-2 text-[12px] transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="font-medium">{interaction.client_name} · {interaction.product_name}</span>
                      <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                        {interaction.topic} · {interaction.manager_name ?? "Sem responsável"} · {formatDate(interaction.occurred_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
