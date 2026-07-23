-- ============================================================================
-- Níveis de acesso — enforcement: Admin > Gerente > Analista.
--
-- Admin:    controle total (inclui Configurações — usuários, produtos,
--           gestores, health score, API keys, auditoria).
-- Gerente:  CRUD completo na operação do dia a dia (clientes, produtos,
--           pessoas, interações), sem acesso a Configurações.
-- Analista: leitura em tudo + pode registrar novas interações; não edita
--           cadastros (clientes/produtos/pessoas) nem interações de terceiros.
--
-- "Gestor" (deep_managers) passa a ser conceitualmente unificado com
-- "Usuário": todo Gestor cadastrado a partir de agora deve ser convidado como
-- Usuário (papel Gerente por padrão). Os 4 registros de seed existentes
-- (dados fictícios) NÃO são convidados automaticamente — ficam com
-- linked_user_id nulo até que um admin vincule manualmente pela tela de
-- Configurações.
-- ============================================================================

-- Preserva a capacidade atual: quem já era 'member' vira 'gerente' (member
-- podia editar tudo; gerente mantém esse comportamento).
update public.user_profiles set role = 'gerente' where role = 'member';

-- Vínculo opcional entre um Gestor legado e um Usuário real (login).
alter table public.deep_managers
  add column linked_user_id uuid references public.user_profiles (id) on delete set null;

-- Novos convites passam a nascer como 'analista' (privilégio mínimo por
-- padrão) em vez do antigo 'member', que deixou de existir na UI.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, name, role)
  values (new.id, new.email, 'analista')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Autopreenche o autor da interação (permite policy de "dono" para Analista).
alter table public.interactions
  alter column created_by set default auth.uid();

create or replace function public.is_admin_or_gerente()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role in ('admin', 'gerente')
  );
$$;

-- clients: apenas admin/gerente escrevem
drop policy if exists "authenticated write clients" on public.clients;
create policy "gerente+ write clients" on public.clients
  for all to authenticated using (public.is_admin_or_gerente()) with check (public.is_admin_or_gerente());

-- products: apenas admin/gerente escrevem
drop policy if exists "authenticated write products" on public.products;
create policy "gerente+ write products" on public.products
  for all to authenticated using (public.is_admin_or_gerente()) with check (public.is_admin_or_gerente());

-- client_contacts (Pessoas): apenas admin/gerente escrevem
drop policy if exists "authenticated write client_contacts" on public.client_contacts;
create policy "gerente+ write client_contacts" on public.client_contacts
  for all to authenticated using (public.is_admin_or_gerente()) with check (public.is_admin_or_gerente());

-- deep_managers (catálogo legado de Gestores): apenas admin/gerente escrevem
drop policy if exists "authenticated write deep_managers" on public.deep_managers;
create policy "gerente+ write deep_managers" on public.deep_managers
  for all to authenticated using (public.is_admin_or_gerente()) with check (public.is_admin_or_gerente());

-- interactions: qualquer papel registra (insert); update/delete restrito a
-- admin/gerente ou ao próprio autor (analista só mexe no que registrou).
drop policy if exists "authenticated write interactions" on public.interactions;
create policy "authenticated insert interactions" on public.interactions
  for insert to authenticated with check (true);
create policy "gerente+ or owner update interactions" on public.interactions
  for update to authenticated
  using (public.is_admin_or_gerente() or created_by = auth.uid())
  with check (public.is_admin_or_gerente() or created_by = auth.uid());
create policy "gerente+ or owner delete interactions" on public.interactions
  for delete to authenticated
  using (public.is_admin_or_gerente() or created_by = auth.uid());
