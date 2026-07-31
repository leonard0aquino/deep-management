begin;

update public.user_profiles
set role = 'analista'
where role::text = 'executivo';

alter table public.user_profiles
  drop constraint if exists user_profiles_role_check;

-- PostgreSQL não remove valores de enum com segurança. Esta constraint
-- restaura o conjunto anterior e mantém o valor residual inutilizável.
alter table public.user_profiles
  add constraint user_profiles_role_legacy_check
  check (role::text in ('admin', 'member', 'gerente', 'analista'));

drop index if exists public.deep_managers_linked_user_unique_idx;

comment on column public.user_profiles.role is null;

create policy "gerente manages non-admin profiles" on public.user_profiles
  for update to authenticated
  using (public.is_gerente() and role <> 'admin')
  with check (public.is_gerente() and role <> 'admin');

commit;
