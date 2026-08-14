-- Evita recursão infinita caso exista ciclo acidental na hierarquia.

begin;

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

commit;
