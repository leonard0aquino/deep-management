-- Acesso operacional complementar ao Comercial sem alterar a área principal.

begin;

alter table public.user_profiles
  add column if not exists commercial_access boolean not null default false;

comment on column public.user_profiles.commercial_access is
  'Concede acesso operacional complementar ao Comercial sem alterar business_area.';

create or replace function private.is_commercial_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_profiles as profile
    where profile.id = target_user_id
      and (profile.business_area = 'commercial' or profile.commercial_access)
  );
$$;

revoke all on function private.is_commercial_user(uuid)
  from public, anon, authenticated;

create or replace function private.can_access_commercial_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with recursive caller as (
    select profile.id, profile.role
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and private.is_commercial_user(profile.id)
  ), visible_users as (
    select caller.id from caller
    union
    select report.id
    from public.user_profiles as report
    join visible_users as leader on report.manager_user_id = leader.id
    where private.is_commercial_user(report.id)
  )
  select (select auth.uid()) is not null and (
    exists (
      select 1 from public.user_profiles
      where id = (select auth.uid()) and role in ('admin', 'executivo')
    )
    or target_user_id in (select id from visible_users)
  );
$$;

create or replace function private.can_access_commercial_manager(target_manager_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1 from public.user_profiles
      where id = (select auth.uid()) and role in ('admin', 'executivo')
    )
    or exists (
      select 1
      from public.deep_managers as manager
      where manager.id = target_manager_id
        and manager.active
        and private.can_access_commercial_user(manager.linked_user_id)
    )
  );
$$;

create or replace function private.is_current_commercial_manager(target_manager_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.deep_managers as manager
    where manager.id = target_manager_id
      and manager.linked_user_id = (select auth.uid())
      and manager.active
      and private.is_commercial_user(manager.linked_user_id)
  );
$$;

do $migration$
declare
  function_name text;
  target_oid oid;
  patched_count integer;
  definition text;
  updated_definition text;
begin
  foreach function_name in array array[
    'prepare_commercial_opportunity',
    'prepare_commercial_agenda_entry',
    'prepare_commercial_cockpit_state',
    'prepare_commercial_daily_prospecting',
    'prepare_commercial_stage_scope'
  ] loop
    patched_count := 0;
    for target_oid in
      select procedure.oid
      from pg_proc as procedure
      join pg_namespace as namespace on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'private'
        and procedure.proname = function_name
        and procedure.prokind = 'f'
    loop
      definition := pg_get_functiondef(target_oid);
      updated_definition := replace(
        definition,
        'profile.business_area = ''commercial''',
        '(profile.business_area = ''commercial'' or profile.commercial_access)'
      );

      if updated_definition is not distinct from definition then
        raise exception 'Função % (oid %) não contém a regra Comercial esperada.', function_name, target_oid;
      end if;

      execute updated_definition;
      patched_count := patched_count + 1;
    end loop;

    if patched_count = 0 then
      raise exception 'Função private.% não encontrada.', function_name;
    end if;
  end loop;
end;
$migration$;

create or replace function private.sync_default_commercial_stage_scopes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := coalesce((select auth.uid()), new.id);
  new_is_commercial boolean := new.business_area = 'commercial' or new.commercial_access;
  old_is_commercial boolean := case
    when tg_op = 'INSERT' then false
    else old.business_area = 'commercial' or old.commercial_access
  end;
begin
  if new_is_commercial and not old_is_commercial then
    insert into public.commercial_user_stage_scopes (
      owner_user_id,
      stage,
      active,
      created_by,
      updated_by
    )
    select new.id, stage.value, true, actor_id, actor_id
    from (
      values ('prospecting'), ('meetings'), ('nda_poc'), ('won')
    ) as stage(value)
    on conflict (owner_user_id, stage) do update set
      active = true,
      updated_by = actor_id,
      updated_at = now();
  elsif not new_is_commercial and old_is_commercial then
    update public.commercial_user_stage_scopes
    set active = false,
        updated_by = actor_id,
        updated_at = now()
    where owner_user_id = new.id
      and active;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_default_commercial_stage_scopes on public.user_profiles;
create trigger sync_default_commercial_stage_scopes
  after insert or update of business_area, commercial_access on public.user_profiles
  for each row execute function private.sync_default_commercial_stage_scopes();

commit;
