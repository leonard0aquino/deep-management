-- Story 4.4 — Metas internas da AISphere.

create table public.internal_goals (
  key text primary key check (key in (
    'portfolio_on_track',
    'actions_on_time',
    'strategic_stakeholder_coverage',
    'risk_client_reduction',
    'alert_response_time',
    'updated_success_plans'
  )),
  target_value numeric(7,2) not null,
  baseline_value numeric(10,2),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_goals_target_range check (
    (key = 'alert_response_time' and target_value between 1 and 720)
    or (key <> 'alert_response_time' and target_value between 0 and 100)
  ),
  constraint internal_goals_baseline_valid check (
    (key = 'risk_client_reduction' and (baseline_value is null or baseline_value > 0))
    or (key <> 'risk_client_reduction' and baseline_value is null)
  )
);

insert into public.internal_goals (key, target_value, baseline_value) values
  ('portfolio_on_track', 90, null),
  ('actions_on_time', 90, null),
  ('strategic_stakeholder_coverage', 75, null),
  ('risk_client_reduction', 20, null),
  ('alert_response_time', 24, null),
  ('updated_success_plans', 90, null);

create trigger internal_goals_set_updated_at
  before update on public.internal_goals
  for each row execute function public.set_updated_at();

create or replace function public.set_internal_goal_updated_by()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_by = auth.uid();
  return new;
end;
$$;

create trigger internal_goals_set_updated_by
  before update on public.internal_goals
  for each row execute function public.set_internal_goal_updated_by();

alter table public.internal_goals enable row level security;

create policy "authenticated read internal goals"
  on public.internal_goals for select to authenticated
  using ((select auth.uid()) is not null);

create policy "gerente+ update internal goals"
  on public.internal_goals for update to authenticated
  using ((select public.is_admin_or_gerente()))
  with check ((select public.is_admin_or_gerente()));

revoke all on table public.internal_goals from anon;
revoke all on table public.internal_goals from authenticated;
grant select, update on table public.internal_goals to authenticated;
grant select, insert, update, delete on table public.internal_goals to service_role;

comment on table public.internal_goals is
  'Alvos gerenciais fixos da AISphere; leitura interna e edição restrita à liderança.';
