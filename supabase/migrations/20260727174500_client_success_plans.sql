-- ============================================================================
-- Story 2.1 — Plano de Sucesso do Cliente
-- Um plano por cliente, com marcos operacionais e escrita restrita a gestores.
-- ============================================================================

create type public.success_plan_status as enum (
  'rascunho',
  'ativo',
  'concluido',
  'cancelado'
);

create type public.success_milestone_status as enum (
  'pendente',
  'em_andamento',
  'concluido',
  'cancelado'
);

create table public.client_success_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients (id) on delete cascade,
  objective text not null check (length(trim(objective)) between 3 and 500),
  expected_outcome text not null check (length(trim(expected_outcome)) between 3 and 1000),
  owner_manager_id uuid not null references public.deep_managers (id) on delete restrict,
  target_date date not null,
  status public.success_plan_status not null default 'rascunho',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_success_milestones (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.client_success_plans (id) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 300),
  owner_manager_id uuid references public.deep_managers (id) on delete set null,
  target_date date not null,
  status public.success_milestone_status not null default 'pendente',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_success_plans_owner_target_idx
  on public.client_success_plans (owner_manager_id, target_date);

create index client_success_plans_created_by_idx
  on public.client_success_plans (created_by);

create index client_success_plans_updated_by_idx
  on public.client_success_plans (updated_by);

create index client_success_milestones_plan_target_idx
  on public.client_success_milestones (plan_id, target_date);

create index client_success_milestones_owner_status_target_idx
  on public.client_success_milestones (owner_manager_id, status, target_date);

create index client_success_milestones_created_by_idx
  on public.client_success_milestones (created_by);

create index client_success_milestones_updated_by_idx
  on public.client_success_milestones (updated_by);

create trigger client_success_plans_set_updated_at
  before update on public.client_success_plans
  for each row execute function public.set_updated_at();

create trigger client_success_milestones_set_updated_at
  before update on public.client_success_milestones
  for each row execute function public.set_updated_at();

create or replace function public.set_success_record_updated_by()
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

create trigger client_success_plans_set_updated_by
  before update on public.client_success_plans
  for each row execute function public.set_success_record_updated_by();

create trigger client_success_milestones_set_updated_by
  before update on public.client_success_milestones
  for each row execute function public.set_success_record_updated_by();

alter table public.client_success_plans enable row level security;
alter table public.client_success_milestones enable row level security;

create policy "authenticated read client success plans"
  on public.client_success_plans for select to authenticated using (true);

create policy "gerente+ insert client success plans"
  on public.client_success_plans for insert to authenticated
  with check ((select public.is_admin_or_gerente()));

create policy "gerente+ update client success plans"
  on public.client_success_plans for update to authenticated
  using ((select public.is_admin_or_gerente()))
  with check ((select public.is_admin_or_gerente()));

create policy "gerente+ delete client success plans"
  on public.client_success_plans for delete to authenticated
  using ((select public.is_admin_or_gerente()));

create policy "authenticated read client success milestones"
  on public.client_success_milestones for select to authenticated using (true);

create policy "gerente+ insert client success milestones"
  on public.client_success_milestones for insert to authenticated
  with check ((select public.is_admin_or_gerente()));

create policy "gerente+ update client success milestones"
  on public.client_success_milestones for update to authenticated
  using ((select public.is_admin_or_gerente()))
  with check ((select public.is_admin_or_gerente()));

create policy "gerente+ delete client success milestones"
  on public.client_success_milestones for delete to authenticated
  using ((select public.is_admin_or_gerente()));

revoke all on table public.client_success_plans from anon;
revoke all on table public.client_success_milestones from anon;

grant select, insert, update, delete on table public.client_success_plans to authenticated;
grant select, insert, update, delete on table public.client_success_milestones to authenticated;
grant select, insert, update, delete on table public.client_success_plans to service_role;
grant select, insert, update, delete on table public.client_success_milestones to service_role;

comment on table public.client_success_plans is
  'Plano de sucesso vigente de cada cliente, mantido por administradores e gerentes.';

comment on table public.client_success_milestones is
  'Marcos que materializam o progresso do plano de sucesso do cliente.';
