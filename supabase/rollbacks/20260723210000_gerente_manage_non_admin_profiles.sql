begin;
drop policy if exists "gerente manages non-admin profiles" on public.user_profiles;
drop function if exists public.is_gerente();
commit;
