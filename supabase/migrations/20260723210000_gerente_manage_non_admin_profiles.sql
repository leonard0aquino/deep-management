-- ============================================================================
-- Gerente pode gerenciar Usuários (criar via convite, ajustar papel), mas
-- nunca conceder nem tocar em contas Admin — isso continua exclusivo de
-- Admin. A policy exige que o papel ANTES e DEPOIS da alteração não seja
-- 'admin'; a policy "admin manages profiles" já existente cobre o Admin.
-- ============================================================================

create or replace function public.is_gerente()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'gerente'
  );
$$;

create policy "gerente manages non-admin profiles" on public.user_profiles
  for update to authenticated
  using (public.is_gerente() and role <> 'admin')
  with check (public.is_gerente() and role <> 'admin');
