-- Story 2.3 — Renovação e Expansão da Carteira

create type public.client_commercial_plan_status as enum (
  'nao_iniciado',
  'em_preparacao',
  'em_negociacao',
  'renovado',
  'perdido'
);

create table public.client_commercial_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients (id) on delete cascade,
  owner_manager_id uuid not null references public.deep_managers (id) on delete restrict,
  status public.client_commercial_plan_status not null default 'nao_iniciado',
  probability smallint not null default 50 check (probability between 0 and 100),
  expected_renewal_value numeric(14,2) not null check (expected_renewal_value >= 0),
  expansion_value numeric(14,2) not null default 0 check (expansion_value >= 0),
  next_step text not null check (length(trim(next_step)) between 3 and 500),
  next_step_due_date date not null,
  notes text check (notes is null or length(trim(notes)) between 3 and 2000),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_commercial_plans_owner_status_due_idx
  on public.client_commercial_plans (owner_manager_id, status, next_step_due_date);
create index client_commercial_plans_created_by_idx on public.client_commercial_plans (created_by);
create index client_commercial_plans_updated_by_idx on public.client_commercial_plans (updated_by);

create trigger client_commercial_plans_set_updated_at
  before update on public.client_commercial_plans
  for each row execute function public.set_updated_at();

create or replace function public.set_client_commercial_plan_updated_by()
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

create trigger client_commercial_plans_set_updated_by
  before update on public.client_commercial_plans
  for each row execute function public.set_client_commercial_plan_updated_by();

alter table public.client_commercial_plans enable row level security;

create policy "authenticated read client commercial plans"
  on public.client_commercial_plans for select to authenticated using (true);
create policy "gerente+ insert client commercial plans"
  on public.client_commercial_plans for insert to authenticated
  with check ((select public.is_admin_or_gerente()));
create policy "gerente+ update client commercial plans"
  on public.client_commercial_plans for update to authenticated
  using ((select public.is_admin_or_gerente()))
  with check ((select public.is_admin_or_gerente()));
create policy "gerente+ delete client commercial plans"
  on public.client_commercial_plans for delete to authenticated
  using ((select public.is_admin_or_gerente()));

revoke all on table public.client_commercial_plans from anon;
revoke all on table public.client_commercial_plans from authenticated;
grant select, insert, update, delete on table public.client_commercial_plans to authenticated;
grant select, insert, update, delete on table public.client_commercial_plans to service_role;

comment on table public.client_commercial_plans is
  'Estratégia financeira de renovação e expansão por cliente; contrato vigente permanece em clients.';
