begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
    );
$$;

revoke all on function private.is_internal_user() from public, anon;
grant execute on function private.is_internal_user() to authenticated;

create table if not exists public.action_tasks (
  id uuid primary key default gen_random_uuid(),
  action_key text not null,
  client_id uuid not null references public.clients (id),
  client_name text not null,
  product_id uuid not null references public.products (id),
  product_name text not null,
  priority text not null check (priority in ('alta', 'media')),
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'postponed', 'dismissed')),
  assigned_to uuid references public.user_profiles (id) on delete set null,
  due_date date not null,
  justification text,
  result text,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint action_tasks_action_key_unique unique (action_key),
  constraint action_tasks_action_key_not_blank check (length(trim(action_key)) > 0),
  constraint action_tasks_client_name_not_blank check (length(trim(client_name)) > 0),
  constraint action_tasks_product_name_not_blank check (length(trim(product_name)) > 0),
  constraint action_tasks_reason_not_blank check (length(trim(reason)) > 0),
  constraint action_tasks_postponed_justification check (
    status <> 'postponed' or length(trim(coalesce(justification, ''))) > 0
  ),
  constraint action_tasks_dismissed_justification check (
    status <> 'dismissed' or length(trim(coalesce(justification, ''))) > 0
  ),
  constraint action_tasks_completed_result check (
    status <> 'completed' or length(trim(coalesce(result, ''))) > 0
  )
);

comment on table public.action_tasks is
  'Estado atual das tarefas materializadas a partir de recomendações da Central de Ações.';
comment on column public.action_tasks.action_key is
  'Chave determinística da recomendação; garante uma tarefa compartilhada por ação.';

create index if not exists action_tasks_status_due_date_idx
  on public.action_tasks (status, due_date);
create index if not exists action_tasks_assigned_status_due_idx
  on public.action_tasks (assigned_to, status, due_date);
create index if not exists action_tasks_client_id_idx
  on public.action_tasks (client_id);
create index if not exists action_tasks_product_id_idx
  on public.action_tasks (product_id);

create table if not exists public.action_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.action_tasks (id),
  event_type text not null check (
    event_type in (
      'created',
      'assigned',
      'started',
      'completed',
      'postponed',
      'dismissed',
      'reopened',
      'due_date_changed',
      'updated'
    )
  ),
  from_status text check (
    from_status is null
    or from_status in ('pending', 'in_progress', 'completed', 'postponed', 'dismissed')
  ),
  to_status text not null check (
    to_status in ('pending', 'in_progress', 'completed', 'postponed', 'dismissed')
  ),
  actor_id uuid references auth.users (id) on delete set null,
  assigned_to uuid references public.user_profiles (id) on delete set null,
  due_date date not null,
  justification text,
  result text,
  created_at timestamptz not null default now()
);

comment on table public.action_task_events is
  'Histórico imutável e visível das mudanças realizadas nas tarefas de recomendação.';

create index if not exists action_task_events_task_created_idx
  on public.action_task_events (task_id, created_at desc);
create index if not exists action_task_events_actor_id_idx
  on public.action_task_events (actor_id);
create index if not exists action_task_events_assigned_to_idx
  on public.action_task_events (assigned_to);

create or replace function private.prepare_action_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  transition_allowed boolean;
begin
  if caller_id is null or not (select private.is_internal_user()) then
    raise exception 'authenticated internal user required' using errcode = '42501';
  end if;

  if new.assigned_to is not null and not exists (
    select 1 from public.user_profiles profile where profile.id = new.assigned_to
  ) then
    raise exception 'assignee must be an internal user' using errcode = '23503';
  end if;

  if new.status = 'postponed' and new.due_date <= current_date then
    raise exception 'postponed task requires a future due date' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    select client.name, product.name
      into new.client_name, new.product_name
    from public.clients client
    join public.products product on product.id = new.product_id
    where client.id = new.client_id;

    if new.client_name is null or new.product_name is null then
      raise exception 'task client and product must exist' using errcode = '23503';
    end if;

    new.created_by := caller_id;
    new.updated_by := caller_id;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if new.action_key <> old.action_key
    or new.client_id <> old.client_id
    or new.product_id <> old.product_id then
    raise exception 'task source identity cannot be changed' using errcode = '23514';
  end if;

  if new.status <> old.status then
    transition_allowed := case old.status
      when 'pending' then new.status in ('in_progress', 'completed', 'postponed', 'dismissed')
      when 'in_progress' then new.status in ('pending', 'completed', 'postponed', 'dismissed')
      when 'postponed' then new.status in ('pending', 'in_progress', 'completed', 'dismissed')
      when 'completed' then new.status = 'pending'
      when 'dismissed' then new.status = 'pending'
      else false
    end;

    if not transition_allowed then
      raise exception 'invalid action task transition: % -> %', old.status, new.status
        using errcode = '23514';
    end if;
  end if;

  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.client_name := old.client_name;
  new.product_name := old.product_name;
  new.updated_by := caller_id;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.prepare_action_task() from public, anon, authenticated;

create or replace function private.log_action_task_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_event_type text;
begin
  resolved_event_type := case
    when tg_op = 'INSERT' then 'created'
    when new.status is distinct from old.status and new.status = 'in_progress' then 'started'
    when new.status is distinct from old.status and new.status = 'completed' then 'completed'
    when new.status is distinct from old.status and new.status = 'postponed' then 'postponed'
    when new.status is distinct from old.status and new.status = 'dismissed' then 'dismissed'
    when new.status is distinct from old.status and new.status = 'pending' then 'reopened'
    when new.assigned_to is distinct from old.assigned_to then 'assigned'
    when new.due_date is distinct from old.due_date then 'due_date_changed'
    else 'updated'
  end;

  insert into public.action_task_events (
    task_id,
    event_type,
    from_status,
    to_status,
    actor_id,
    assigned_to,
    due_date,
    justification,
    result
  ) values (
    new.id,
    resolved_event_type,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    (select auth.uid()),
    new.assigned_to,
    new.due_date,
    new.justification,
    new.result
  );

  return new;
end;
$$;

revoke all on function private.log_action_task_event() from public, anon, authenticated;

drop trigger if exists action_tasks_prepare on public.action_tasks;
create trigger action_tasks_prepare
  before insert or update on public.action_tasks
  for each row execute function private.prepare_action_task();

drop trigger if exists action_tasks_log_event on public.action_tasks;
create trigger action_tasks_log_event
  after insert or update on public.action_tasks
  for each row execute function private.log_action_task_event();

alter table public.action_tasks enable row level security;
alter table public.action_task_events enable row level security;

drop policy if exists "internal users read action tasks" on public.action_tasks;
create policy "internal users read action tasks" on public.action_tasks
  for select to authenticated
  using ((select private.is_internal_user()));

drop policy if exists "internal users create action tasks" on public.action_tasks;
create policy "internal users create action tasks" on public.action_tasks
  for insert to authenticated
  with check ((select private.is_internal_user()));

drop policy if exists "internal users update action tasks" on public.action_tasks;
create policy "internal users update action tasks" on public.action_tasks
  for update to authenticated
  using ((select private.is_internal_user()))
  with check ((select private.is_internal_user()));

drop policy if exists "internal users read action task events" on public.action_task_events;
create policy "internal users read action task events" on public.action_task_events
  for select to authenticated
  using ((select private.is_internal_user()));

revoke all on table public.action_tasks from anon;
revoke all on table public.action_task_events from anon;
revoke all on table public.action_tasks from authenticated;
revoke all on table public.action_task_events from authenticated;
grant select, insert, update on table public.action_tasks to authenticated;
grant select on table public.action_task_events to authenticated;

create or replace function public.get_assignable_action_users()
returns table (id uuid, name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_internal_user()) then
    raise exception 'authenticated internal user required' using errcode = '42501';
  end if;

  return query
    select profile.id, profile.name
    from public.user_profiles profile
    order by profile.name;
end;
$$;

revoke all on function public.get_assignable_action_users() from public, anon;
grant execute on function public.get_assignable_action_users() to authenticated;

commit;
