-- Story 6.2 — Funil Comercial auditável.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create type public.commercial_opportunity_stage as enum (
  'prospecting',
  'meeting',
  'qualification',
  'nda_poc',
  'proposal',
  'negotiation',
  'won',
  'lost'
);

create table public.commercial_opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  product_id uuid references public.products (id) on delete set null,
  owner_manager_id uuid not null references public.deep_managers (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 3 and 160),
  stage public.commercial_opportunity_stage not null default 'prospecting',
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  probability smallint not null default 10 check (probability between 0 and 100),
  next_step text check (next_step is null or char_length(btrim(next_step)) between 3 and 500),
  next_step_at timestamptz,
  closed_at timestamptz,
  loss_reason text check (loss_reason is null or char_length(btrim(loss_reason)) between 3 and 500),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_opportunity_loss_reason_check check (stage <> 'lost' or loss_reason is not null)
);

create table public.commercial_opportunity_stage_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.commercial_opportunities (id) on delete restrict,
  from_stage public.commercial_opportunity_stage,
  to_stage public.commercial_opportunity_stage not null,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index commercial_opportunities_client_idx on public.commercial_opportunities (client_id);
create index commercial_opportunities_product_idx on public.commercial_opportunities (product_id) where product_id is not null;
create index commercial_opportunities_owner_stage_idx on public.commercial_opportunities (owner_manager_id, stage);
create index commercial_opportunities_stage_next_step_idx on public.commercial_opportunities (stage, next_step_at) where stage not in ('won', 'lost');
create index commercial_opportunity_events_opportunity_created_idx on public.commercial_opportunity_stage_events (opportunity_id, created_at desc);

comment on table public.commercial_opportunities is
  'Funil de vendas novas; não substitui client_commercial_plans de renovação e expansão.';
comment on table public.commercial_opportunity_stage_events is
  'Histórico imutável das transições de etapa do funil Comercial.';

create or replace function private.can_access_commercial_manager(target_manager_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with recursive caller as (
    select profile.id, profile.role, profile.business_area
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
  ), visible_users as (
    select caller.id
    from caller
    where caller.business_area = 'commercial'
    union all
    select report.id
    from public.user_profiles as report
    join visible_users as leader on report.manager_user_id = leader.id
    where report.business_area = 'commercial'
  )
  select (select auth.uid()) is not null and (
    exists (select 1 from caller where role in ('admin', 'executivo'))
    or exists (
      select 1
      from public.deep_managers as manager
      join visible_users as visible on visible.id = manager.linked_user_id
      where manager.id = target_manager_id and manager.active
    )
  );
$$;

revoke all on function private.can_access_commercial_manager(uuid) from public, anon;
grant execute on function private.can_access_commercial_manager(uuid) to authenticated, service_role;

create or replace function private.prepare_commercial_opportunity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  owner_is_commercial boolean;
begin
  select exists (
    select 1
    from public.deep_managers as manager
    join public.user_profiles as profile on profile.id = manager.linked_user_id
    where manager.id = new.owner_manager_id
      and manager.active
      and profile.business_area = 'commercial'
  ) into owner_is_commercial;

  if not owner_is_commercial then
    raise exception 'O responsável da oportunidade deve pertencer à área Comercial.';
  end if;

  new.name := btrim(new.name);
  new.next_step := nullif(btrim(new.next_step), '');
  new.loss_reason := nullif(btrim(new.loss_reason), '');
  new.updated_at := now();
  new.updated_by := coalesce(caller_id, new.updated_by);

  if tg_op = 'INSERT' then
    new.created_by := coalesce(caller_id, new.created_by);
  end if;

  if new.stage in ('won', 'lost') then
    new.closed_at := coalesce(new.closed_at, now());
  else
    new.closed_at := null;
    new.loss_reason := null;
  end if;

  return new;
end;
$$;

create or replace function private.log_commercial_opportunity_stage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.stage is distinct from old.stage then
    insert into public.commercial_opportunity_stage_events (
      opportunity_id, from_stage, to_stage, actor_id
    ) values (
      new.id,
      case when tg_op = 'INSERT' then null else old.stage end,
      new.stage,
      coalesce((select auth.uid()), new.updated_by, new.created_by)
    );
  end if;
  return new;
end;
$$;

revoke all on function private.prepare_commercial_opportunity() from public, anon, authenticated;
revoke all on function private.log_commercial_opportunity_stage() from public, anon, authenticated;

create trigger commercial_opportunities_prepare
before insert or update on public.commercial_opportunities
for each row execute function private.prepare_commercial_opportunity();

create trigger commercial_opportunities_log_stage
after insert or update of stage on public.commercial_opportunities
for each row execute function private.log_commercial_opportunity_stage();

alter table public.commercial_opportunities enable row level security;
alter table public.commercial_opportunity_stage_events enable row level security;

create policy "commercial hierarchy reads opportunities"
on public.commercial_opportunities for select to authenticated
using ((select private.can_access_commercial_manager(owner_manager_id)));

create policy "commercial hierarchy creates opportunities"
on public.commercial_opportunities for insert to authenticated
with check ((select private.can_access_commercial_manager(owner_manager_id)));

create policy "commercial hierarchy updates opportunities"
on public.commercial_opportunities for update to authenticated
using ((select private.can_access_commercial_manager(owner_manager_id)))
with check ((select private.can_access_commercial_manager(owner_manager_id)));

create policy "commercial hierarchy reads opportunity events"
on public.commercial_opportunity_stage_events for select to authenticated
using (exists (
  select 1
  from public.commercial_opportunities as opportunity
  where opportunity.id = opportunity_id
    and (select private.can_access_commercial_manager(opportunity.owner_manager_id))
));

revoke all on public.commercial_opportunities, public.commercial_opportunity_stage_events from anon, authenticated;
grant select, insert, update on public.commercial_opportunities to authenticated;
grant select on public.commercial_opportunity_stage_events to authenticated;
grant select, insert, update, delete on public.commercial_opportunities, public.commercial_opportunity_stage_events to service_role;
