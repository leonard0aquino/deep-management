-- Story 4.10 — níveis de acesso suportados pela aplicação.

alter type public.user_role add value if not exists 'executivo' after 'admin';

begin;

alter table public.user_profiles
  drop constraint if exists user_profiles_role_legacy_check;

alter table public.user_profiles
  add constraint user_profiles_role_check
  check (role::text in ('admin', 'executivo', 'gerente', 'analista'))
  not valid;

alter table public.user_profiles
  validate constraint user_profiles_role_check;

comment on column public.user_profiles.role is
  'Nível de acesso interno: admin, executivo, gerente ou analista.';

create unique index deep_managers_linked_user_unique_idx
  on public.deep_managers (linked_user_id)
  where linked_user_id is not null;

-- A gestão de usuários e configurações passa a ser exclusiva de Admin.
drop policy if exists "gerente manages non-admin profiles" on public.user_profiles;

commit;
