-- ============================================================================
-- Story 2.2 — Gestão de Riscos e Oportunidades
-- Registro operacional por cliente, com prioridade, responsável e prazo.
-- ============================================================================

create type public.client_portfolio_item_kind as enum ('risco', 'oportunidade');
create type public.client_portfolio_item_impact as enum ('baixo', 'medio', 'alto');
create type public.client_portfolio_item_probability as enum ('baixa', 'media', 'alta');
create type public.client_portfolio_item_status as enum (
  'aberto',
  'em_andamento',
  'concluido',
  'descartado'
);

create table public.client_risk_opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  kind public.client_portfolio_item_kind not null,
  title text not null check (length(trim(title)) between 3 and 300),
  description text check (description is null or length(trim(description)) between 3 and 1000),
  impact public.client_portfolio_item_impact not null,
  probability public.client_portfolio_item_probability not null,
  owner_manager_id uuid not null references public.deep_managers (id) on delete restrict,
  target_date date not null,
  status public.client_portfolio_item_status not null default 'aberto',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_risk_opportunities_client_kind_status_target_idx
  on public.client_risk_opportunities (client_id, kind, status, target_date);
create index client_risk_opportunities_owner_status_target_idx
  on public.client_risk_opportunities (owner_manager_id, status, target_date);
create index client_risk_opportunities_created_by_idx
  on public.client_risk_opportunities (created_by);
create index client_risk_opportunities_updated_by_idx
  on public.client_risk_opportunities (updated_by);

create trigger client_risk_opportunities_set_updated_at
  before update on public.client_risk_opportunities
  for each row execute function public.set_updated_at();

create or replace function public.set_client_portfolio_item_updated_by()
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

create trigger client_risk_opportunities_set_updated_by
  before update on public.client_risk_opportunities
  for each row execute function public.set_client_portfolio_item_updated_by();

alter table public.client_risk_opportunities enable row level security;

create policy "authenticated read client risk opportunities"
  on public.client_risk_opportunities for select to authenticated using (true);
create policy "gerente+ insert client risk opportunities"
  on public.client_risk_opportunities for insert to authenticated
  with check ((select public.is_admin_or_gerente()));
create policy "gerente+ update client risk opportunities"
  on public.client_risk_opportunities for update to authenticated
  using ((select public.is_admin_or_gerente()))
  with check ((select public.is_admin_or_gerente()));
create policy "gerente+ delete client risk opportunities"
  on public.client_risk_opportunities for delete to authenticated
  using ((select public.is_admin_or_gerente()));

revoke all on table public.client_risk_opportunities from anon;
grant select, insert, update, delete on table public.client_risk_opportunities to authenticated;
grant select, insert, update, delete on table public.client_risk_opportunities to service_role;

comment on table public.client_risk_opportunities is
  'Riscos e oportunidades estruturados da carteira, mantidos por administradores e gerentes.';
