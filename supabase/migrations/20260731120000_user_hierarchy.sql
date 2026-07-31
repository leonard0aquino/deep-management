-- Story 4.11 — hierarquia dos usuários Deep.
-- Cadeia: Executivo → Gerente → Supervisor → Analista. Admin fica fora.

alter type public.user_role add value if not exists 'supervisor' after 'gerente';

begin;

alter table public.user_profiles
  add column manager_user_id uuid references public.user_profiles (id) on delete set null;

create index user_profiles_manager_user_idx
  on public.user_profiles (manager_user_id)
  where manager_user_id is not null;

alter table public.user_profiles
  drop constraint if exists user_profiles_role_check;

alter table public.user_profiles
  add constraint user_profiles_role_check
  check (role::text in ('admin', 'executivo', 'gerente', 'supervisor', 'analista'))
  not valid;

alter table public.user_profiles
  validate constraint user_profiles_role_check;

-- Mantém as policies operacionais existentes e inclui Supervisor no mesmo
-- nível de escrita do Gerente, sem conceder acesso administrativo.
create or replace function public.is_admin_or_gerente()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = (select auth.uid()) and role::text in ('admin', 'gerente', 'supervisor')
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

create or replace function public.validate_user_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  leader_role text;
  expected_leader_role text;
  invalid_direct_report boolean;
begin
  if new.manager_user_id = new.id then
    raise exception 'Um usuário não pode ser seu próprio líder.';
  end if;

  expected_leader_role := case new.role::text
    when 'gerente' then 'executivo'
    when 'supervisor' then 'gerente'
    when 'analista' then 'supervisor'
    else null
  end;

  if expected_leader_role is null and new.manager_user_id is not null then
    raise exception 'Usuários com papel % não possuem líder direto.', new.role::text;
  end if;

  if new.manager_user_id is not null then
    select role::text into leader_role
    from public.user_profiles
    where id = new.manager_user_id;

    if leader_role is distinct from expected_leader_role then
      raise exception 'O líder de % deve possuir o papel %.', new.role::text, expected_leader_role;
    end if;
  end if;

  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    select exists (
      select 1
      from public.user_profiles report
      where report.manager_user_id = new.id
        and report.role::text is distinct from case new.role::text
          when 'executivo' then 'gerente'
          when 'gerente' then 'supervisor'
          when 'supervisor' then 'analista'
          else null
        end
    ) into invalid_direct_report;

    if invalid_direct_report then
      raise exception 'O novo papel invalida subordinados diretos existentes.';
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_user_hierarchy_before_write
  before insert or update of role, manager_user_id on public.user_profiles
  for each row execute function public.validate_user_hierarchy();

comment on column public.user_profiles.manager_user_id is
  'Líder direto na cadeia Executivo → Gerente → Supervisor → Analista.';

comment on column public.user_profiles.role is
  'Nível interno: admin, executivo, gerente, supervisor ou analista.';

commit;
