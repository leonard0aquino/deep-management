begin;

do $rollback$
declare
  function_name text;
  target_oid oid;
  patched_count integer;
  definition text;
  restored_definition text;
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
      restored_definition := replace(
        definition,
        '(profile.business_area = ''commercial'' or profile.commercial_access)',
        'profile.business_area = ''commercial'''
      );

      if restored_definition is not distinct from definition then
        raise exception 'Função % (oid %) não contém a regra complementar esperada.', function_name, target_oid;
      end if;

      execute restored_definition;
      patched_count := patched_count + 1;
    end loop;

    if patched_count = 0 then
      raise exception 'Função private.% não encontrada.', function_name;
    end if;
  end loop;
end;
$rollback$;

create or replace function private.can_access_commercial_user(target_user_id uuid)
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
    join public.user_profiles as profile on profile.id = manager.linked_user_id
    where manager.id = target_manager_id
      and manager.linked_user_id = (select auth.uid())
      and manager.active
      and profile.business_area = 'commercial'
  );
$$;

create or replace function private.sync_default_commercial_stage_scopes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := coalesce((select auth.uid()), new.id);
begin
  if new.business_area = 'commercial'
    and (tg_op = 'INSERT' or old.business_area is distinct from new.business_area) then
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
  elsif new.business_area <> 'commercial'
    and tg_op = 'UPDATE'
    and old.business_area is distinct from new.business_area then
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
  after insert or update of business_area on public.user_profiles
  for each row execute function private.sync_default_commercial_stage_scopes();

drop function if exists private.is_commercial_user(uuid);

alter table public.commercial_user_stage_scopes
  disable trigger prepare_commercial_stage_scope;

update public.commercial_user_stage_scopes as scope
set active = false,
    updated_at = now()
where scope.active
  and exists (
    select 1
    from public.user_profiles as profile
    where profile.id = scope.owner_user_id
      and profile.commercial_access
      and profile.business_area is distinct from 'commercial'
  );

alter table public.commercial_user_stage_scopes
  enable trigger prepare_commercial_stage_scope;

alter table public.user_profiles
  drop column if exists commercial_access;

commit;
