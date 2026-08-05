-- Story 6.2 — usuário Comercial pode ser responsável sem vínculo legado em deep_managers.

alter table public.commercial_opportunities
  alter column owner_manager_id drop not null;

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

revoke all on function private.can_access_commercial_user(uuid) from public, anon;
grant execute on function private.can_access_commercial_user(uuid) to authenticated, service_role;

create or replace function private.prepare_commercial_opportunity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  effective_creator_id uuid;
  creator_is_commercial boolean;
  owner_is_commercial boolean;
begin
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    effective_creator_id := old.created_by;
  else
    effective_creator_id := coalesce(caller_id, new.created_by);
  end if;

  select exists (
    select 1 from public.user_profiles as profile
    where profile.id = effective_creator_id
      and profile.business_area = 'commercial'
  ) into creator_is_commercial;

  if new.owner_manager_id is null then
    if not creator_is_commercial then
      raise exception 'O responsável sem gestor vinculado deve pertencer à área Comercial.';
    end if;
  else
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

drop policy if exists "commercial hierarchy reads opportunities" on public.commercial_opportunities;
create policy "commercial hierarchy reads opportunities"
on public.commercial_opportunities for select to authenticated
using (
  (owner_manager_id is not null and (select private.can_access_commercial_manager(owner_manager_id)))
  or (owner_manager_id is null and (select private.can_access_commercial_user(created_by)))
);

drop policy if exists "commercial user creates own opportunities" on public.commercial_opportunities;
create policy "commercial user creates own opportunities"
on public.commercial_opportunities for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.can_access_commercial_user(created_by))
  and (
    owner_manager_id is null
    or (select private.is_current_commercial_manager(owner_manager_id))
  )
);

drop policy if exists "commercial hierarchy updates opportunities" on public.commercial_opportunities;
create policy "commercial hierarchy updates opportunities"
on public.commercial_opportunities for update to authenticated
using (
  (owner_manager_id is not null and (select private.can_access_commercial_manager(owner_manager_id)))
  or (owner_manager_id is null and (select private.can_access_commercial_user(created_by)))
)
with check (
  created_by is not null
  and (
    (owner_manager_id is not null and (select private.can_access_commercial_manager(owner_manager_id)))
    or (owner_manager_id is null and (select private.can_access_commercial_user(created_by)))
  )
);

drop policy if exists "commercial hierarchy reads opportunity events" on public.commercial_opportunity_stage_events;
create policy "commercial hierarchy reads opportunity events"
on public.commercial_opportunity_stage_events for select to authenticated
using (exists (
  select 1
  from public.commercial_opportunities as opportunity
  where opportunity.id = opportunity_id
    and (
      (opportunity.owner_manager_id is not null and (select private.can_access_commercial_manager(opportunity.owner_manager_id)))
      or (opportunity.owner_manager_id is null and (select private.can_access_commercial_user(opportunity.created_by)))
    )
));
