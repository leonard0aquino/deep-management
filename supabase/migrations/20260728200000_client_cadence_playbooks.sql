-- Story 2.5 — Cadências e Playbooks de Customer Success

create type public.client_cadence_status as enum ('active', 'completed');

create table public.customer_playbooks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 3 and 120),
  description text check (description is null or length(trim(description)) between 3 and 500),
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_playbook_steps (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references public.customer_playbooks (id) on delete cascade,
  position integer not null check (position > 0),
  title text not null check (length(trim(title)) between 3 and 160),
  guidance text check (guidance is null or length(trim(guidance)) between 3 and 500),
  day_offset integer not null check (day_offset between 0 and 730),
  priority text not null default 'media' check (priority in ('alta', 'media')),
  recommended_interaction_type public.interaction_type not null default 'meeting',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (playbook_id, position)
);

create table public.client_cadences (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references public.customer_playbooks (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  owner_manager_id uuid not null references public.deep_managers (id) on delete restrict,
  start_date date not null,
  status public.client_cadence_status not null default 'active',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index customer_playbook_steps_playbook_order_idx
  on public.customer_playbook_steps (playbook_id, position);
create index client_cadences_client_status_idx
  on public.client_cadences (client_id, status, start_date desc);
create index client_cadences_owner_status_idx
  on public.client_cadences (owner_manager_id, status);
create unique index client_cadences_active_client_product_idx
  on public.client_cadences (client_id, product_id)
  where status = 'active';

alter table public.action_tasks
  add column client_cadence_id uuid references public.client_cadences (id) on delete restrict,
  add column playbook_step_id uuid references public.customer_playbook_steps (id) on delete restrict,
  add column recommended_interaction_type public.interaction_type,
  add constraint action_tasks_cadence_source_complete check (
    (client_cadence_id is null and playbook_step_id is null and recommended_interaction_type is null)
    or
    (client_cadence_id is not null and playbook_step_id is not null and recommended_interaction_type is not null)
  );

create index action_tasks_client_cadence_status_due_idx
  on public.action_tasks (client_cadence_id, status, due_date)
  where client_cadence_id is not null;

create trigger customer_playbooks_set_updated_at
  before update on public.customer_playbooks
  for each row execute function public.set_updated_at();

create trigger customer_playbook_steps_set_updated_at
  before update on public.customer_playbook_steps
  for each row execute function public.set_updated_at();

create or replace function public.set_playbook_record_updated_by()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

revoke all on function public.set_playbook_record_updated_by() from public, anon, authenticated;

create trigger customer_playbooks_set_updated_by
  before update on public.customer_playbooks
  for each row execute function public.set_playbook_record_updated_by();

create trigger customer_playbook_steps_set_updated_by
  before update on public.customer_playbook_steps
  for each row execute function public.set_playbook_record_updated_by();

create or replace function private.validate_cadence_action_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.client_cadence_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and (
    new.client_cadence_id is distinct from old.client_cadence_id
    or new.playbook_step_id is distinct from old.playbook_step_id
    or new.recommended_interaction_type is distinct from old.recommended_interaction_type
  ) then
    raise exception 'cadence task source cannot be changed' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.client_cadences cadence
    join public.customer_playbook_steps step
      on step.playbook_id = cadence.playbook_id
     and step.id = new.playbook_step_id
    where cadence.id = new.client_cadence_id
      and cadence.client_id = new.client_id
      and cadence.product_id = new.product_id
  ) then
    raise exception 'invalid cadence task source' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_cadence_action_task() from public, anon, authenticated;

create trigger action_tasks_validate_cadence_source
  before insert or update on public.action_tasks
  for each row execute function private.validate_cadence_action_task();

create or replace function private.refresh_client_cadence_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cadence_id uuid := coalesce(new.client_cadence_id, old.client_cadence_id);
  has_open_tasks boolean;
begin
  if cadence_id is null then
    return new;
  end if;

  select exists (
    select 1
    from public.action_tasks task
    where task.client_cadence_id = cadence_id
      and task.status in ('pending', 'in_progress', 'postponed')
  ) into has_open_tasks;

  update public.client_cadences
  set status = case
        when has_open_tasks then 'active'::public.client_cadence_status
        else 'completed'::public.client_cadence_status
      end,
      completed_at = case when has_open_tasks then null else coalesce(completed_at, now()) end
  where id = cadence_id;

  return new;
end;
$$;

revoke all on function private.refresh_client_cadence_status() from public, anon, authenticated;

create trigger action_tasks_refresh_cadence_status
  after insert or update of status on public.action_tasks
  for each row execute function private.refresh_client_cadence_status();

alter table public.customer_playbooks enable row level security;
alter table public.customer_playbook_steps enable row level security;
alter table public.client_cadences enable row level security;

create policy "authenticated read customer playbooks"
  on public.customer_playbooks for select to authenticated using (true);
create policy "gerente+ insert customer playbooks"
  on public.customer_playbooks for insert to authenticated
  with check ((select public.is_admin_or_gerente()));
create policy "gerente+ update customer playbooks"
  on public.customer_playbooks for update to authenticated
  using ((select public.is_admin_or_gerente()))
  with check ((select public.is_admin_or_gerente()));

create policy "authenticated read customer playbook steps"
  on public.customer_playbook_steps for select to authenticated using (true);
create policy "gerente+ insert customer playbook steps"
  on public.customer_playbook_steps for insert to authenticated
  with check ((select public.is_admin_or_gerente()));
create policy "gerente+ update customer playbook steps"
  on public.customer_playbook_steps for update to authenticated
  using ((select public.is_admin_or_gerente()))
  with check ((select public.is_admin_or_gerente()));
create policy "gerente+ delete customer playbook steps"
  on public.customer_playbook_steps for delete to authenticated
  using ((select public.is_admin_or_gerente()));

create policy "authenticated read client cadences"
  on public.client_cadences for select to authenticated using (true);
create policy "gerente+ insert client cadences"
  on public.client_cadences for insert to authenticated
  with check ((select public.is_admin_or_gerente()));

revoke all on table public.customer_playbooks from anon;
revoke all on table public.customer_playbook_steps from anon;
revoke all on table public.client_cadences from anon;
revoke all on table public.customer_playbooks from authenticated;
revoke all on table public.customer_playbook_steps from authenticated;
revoke all on table public.client_cadences from authenticated;

grant select, insert, update on table public.customer_playbooks to authenticated;
grant select, insert, update, delete on table public.customer_playbook_steps to authenticated;
grant select, insert on table public.client_cadences to authenticated;
grant select, insert, update, delete on table public.customer_playbooks to service_role;
grant select, insert, update, delete on table public.customer_playbook_steps to service_role;
grant select, insert, update, delete on table public.client_cadences to service_role;

create or replace function public.apply_customer_playbook(
  p_playbook_id uuid,
  p_client_id uuid,
  p_product_id uuid,
  p_owner_manager_id uuid,
  p_start_date date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cadence_id uuid;
  assigned_user_id uuid;
  client_name text;
  product_name text;
begin
  if not (select public.is_admin_or_gerente()) then
    raise exception 'manager access required' using errcode = '42501';
  end if;

  if p_start_date is null then
    raise exception 'start date is required' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.customer_playbooks
    where id = p_playbook_id and active
  ) then
    raise exception 'active playbook not found' using errcode = '23503';
  end if;

  if not exists (
    select 1 from public.customer_playbook_steps where playbook_id = p_playbook_id
  ) then
    raise exception 'playbook requires at least one step' using errcode = '23514';
  end if;

  select name into client_name
  from public.clients where id = p_client_id and active;
  if client_name is null then
    raise exception 'active client not found' using errcode = '23503';
  end if;

  select name into product_name
  from public.products where id = p_product_id and active;
  if product_name is null then
    raise exception 'active product not found' using errcode = '23503';
  end if;

  select linked_user_id into assigned_user_id
  from public.deep_managers
  where id = p_owner_manager_id and active and linked_user_id is not null;
  if assigned_user_id is null then
    raise exception 'active manager with linked user required' using errcode = '23503';
  end if;

  begin
    insert into public.client_cadences (
      playbook_id, client_id, product_id, owner_manager_id, start_date
    ) values (
      p_playbook_id, p_client_id, p_product_id, p_owner_manager_id, p_start_date
    ) returning id into cadence_id;
  exception when unique_violation then
    raise exception 'an active cadence already exists for this client and product'
      using errcode = '23505';
  end;

  insert into public.action_tasks (
    action_key,
    client_id,
    client_name,
    product_id,
    product_name,
    priority,
    reason,
    assigned_to,
    due_date,
    client_cadence_id,
    playbook_step_id,
    recommended_interaction_type
  )
  select
    'cadence:' || cadence_id::text || ':step:' || step.id::text,
    p_client_id,
    client_name,
    p_product_id,
    product_name,
    step.priority,
    step.title || case when step.guidance is null then '' else ' — ' || step.guidance end,
    assigned_user_id,
    p_start_date + step.day_offset,
    cadence_id,
    step.id,
    step.recommended_interaction_type
  from public.customer_playbook_steps step
  where step.playbook_id = p_playbook_id
  order by step.position;

  return cadence_id;
end;
$$;

revoke all on function public.apply_customer_playbook(uuid, uuid, uuid, uuid, date) from public, anon;
grant execute on function public.apply_customer_playbook(uuid, uuid, uuid, uuid, date) to authenticated, service_role;

create view public.client_cadence_progress
with (security_invoker = true)
as
select
  cadence.id,
  cadence.playbook_id,
  playbook.name as playbook_name,
  cadence.client_id,
  client.name as client_name,
  cadence.product_id,
  product.name as product_name,
  cadence.owner_manager_id,
  manager.name as owner_manager_name,
  cadence.start_date,
  cadence.status,
  cadence.created_at,
  cadence.completed_at,
  count(task.id)::integer as total_steps,
  count(task.id) filter (where task.status in ('completed', 'dismissed'))::integer as completed_steps,
  case
    when count(task.id) = 0 then 0
    else round(
      count(task.id) filter (where task.status in ('completed', 'dismissed'))::numeric
      * 100 / count(task.id)
    )::integer
  end as progress_percent,
  next_task.id as next_task_id,
  next_task.reason as next_step,
  next_task.due_date as next_due_date,
  next_task.recommended_interaction_type as next_interaction_type,
  next_task.status as next_task_status,
  case
    when next_task.id is null then false
    else next_task.due_date < current_date
  end as next_step_overdue
from public.client_cadences cadence
join public.customer_playbooks playbook on playbook.id = cadence.playbook_id
join public.clients client on client.id = cadence.client_id
join public.products product on product.id = cadence.product_id
join public.deep_managers manager on manager.id = cadence.owner_manager_id
left join public.action_tasks task on task.client_cadence_id = cadence.id
left join lateral (
  select candidate.id, candidate.reason, candidate.due_date,
    candidate.recommended_interaction_type, candidate.status
  from public.action_tasks candidate
  where candidate.client_cadence_id = cadence.id
    and candidate.status in ('pending', 'in_progress', 'postponed')
  order by candidate.due_date, candidate.created_at
  limit 1
) next_task on true
group by cadence.id, playbook.name, client.name, product.name, manager.name,
  next_task.id, next_task.reason, next_task.due_date,
  next_task.recommended_interaction_type, next_task.status;

revoke all on table public.client_cadence_progress from anon;
revoke all on table public.client_cadence_progress from authenticated;
grant select on table public.client_cadence_progress to authenticated, service_role;

comment on table public.customer_playbooks is
  'Biblioteca interna de playbooks reutilizáveis de Customer Success.';
comment on table public.client_cadences is
  'Aplicação de um playbook a um cliente e produto, materializada em action_tasks.';
