begin;

drop trigger if exists validate_user_hierarchy_before_write on public.user_profiles;
drop function if exists public.validate_user_hierarchy();
drop index if exists public.user_profiles_manager_user_idx;

create or replace function public.is_admin_or_gerente()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = (select auth.uid()) and role::text in ('admin', 'gerente')
  );
$$;

drop policy if exists "managers insert contracted products" on public.client_products;
drop policy if exists "managers update contracted products" on public.client_products;
drop policy if exists "managers delete contracted products" on public.client_products;

create policy "managers insert contracted products"
  on public.client_products for insert to authenticated
  with check ((select public.is_admin_or_gerente()));

create policy "managers update contracted products"
  on public.client_products for update to authenticated
  using ((select public.is_admin_or_gerente()))
  with check ((select public.is_admin_or_gerente()));

create policy "managers delete contracted products"
  on public.client_products for delete to authenticated
  using ((select public.is_admin_or_gerente()));

update public.user_profiles
set manager_user_id = null;

alter table public.user_profiles
  drop column if exists manager_user_id;

update public.user_profiles
set role = 'analista'
where role::text = 'supervisor';

alter table public.user_profiles
  drop constraint if exists user_profiles_role_check;

-- PostgreSQL não remove valores de enum com segurança. A constraint volta a
-- impedir o uso do valor residual após converter os perfis existentes.
alter table public.user_profiles
  add constraint user_profiles_role_check
  check (role::text in ('admin', 'executivo', 'gerente', 'analista'));

comment on column public.user_profiles.role is
  'Nível de acesso interno: admin, executivo, gerente ou analista.';

commit;
