-- Story 4.13 — múltiplos responsáveis por combinação cliente e produto.

begin;

create table public.client_product_owners (
  id uuid primary key default gen_random_uuid(),
  client_product_id uuid not null references public.client_products (id) on delete cascade,
  manager_id uuid not null references public.deep_managers (id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_product_id, manager_id)
);

comment on table public.client_product_owners is
  'Responsáveis AISphere atribuídos a uma combinação contratada de cliente e produto.';

create index client_product_owners_manager_active_idx
  on public.client_product_owners (manager_id, client_product_id)
  where active = true;

create index client_product_owners_product_active_idx
  on public.client_product_owners (client_product_id, manager_id)
  where active = true;

create trigger client_product_owners_set_updated_at
  before update on public.client_product_owners
  for each row execute function public.set_updated_at();

alter table public.client_product_owners enable row level security;

create policy "authenticated read client product owners"
  on public.client_product_owners for select to authenticated
  using (true);

create policy "managers insert client product owners"
  on public.client_product_owners for insert to authenticated
  with check ((select public.is_admin_or_gerente()));

create policy "managers update client product owners"
  on public.client_product_owners for update to authenticated
  using ((select public.is_admin_or_gerente()))
  with check ((select public.is_admin_or_gerente()));

create policy "managers delete client product owners"
  on public.client_product_owners for delete to authenticated
  using ((select public.is_admin_or_gerente()));

revoke all on public.client_product_owners from anon, authenticated;
grant select, insert, update, delete on public.client_product_owners to authenticated;
grant all on public.client_product_owners to service_role;

insert into public.client_product_owners (client_product_id, manager_id)
select cp.id, cp.owner_manager_id
from public.client_products cp
where cp.owner_manager_id is not null
on conflict (client_product_id, manager_id) do update
set active = true, updated_at = now();

create or replace function public.sync_legacy_client_product_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_manager_id is not null then
    insert into public.client_product_owners (client_product_id, manager_id)
    values (new.id, new.owner_manager_id)
    on conflict (client_product_id, manager_id) do update
    set active = true, updated_at = now();
  end if;
  return new;
end;
$$;

create trigger sync_legacy_client_product_owner_after_write
  after insert or update of owner_manager_id on public.client_products
  for each row execute function public.sync_legacy_client_product_owner();

comment on column public.client_products.owner_manager_id is
  'Campo legado de compatibilidade. Os responsáveis vigentes ficam em client_product_owners.';

commit;
