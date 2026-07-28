-- Story 3.1 — Importação estruturada

create table public.client_products (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  contract_value numeric(14, 2) check (contract_value is null or contract_value >= 0),
  renewal_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, product_id)
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('clients', 'people', 'contracts', 'interactions')),
  file_name text not null check (length(trim(file_name)) between 1 and 255),
  total_rows integer not null check (total_rows > 0 and total_rows <= 5000),
  imported_rows integer not null check (imported_rows >= 0 and imported_rows <= total_rows),
  created_by uuid not null references auth.users (id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now()
);

create index import_batches_created_at_idx on public.import_batches (created_at desc);
create index client_products_client_active_idx on public.client_products (client_id, active);

create trigger client_products_set_updated_at
  before update on public.client_products
  for each row execute function public.set_updated_at();

alter table public.client_products enable row level security;
alter table public.import_batches enable row level security;

create policy "authenticated read contracted products"
  on public.client_products for select to authenticated using (true);

create policy "managers manage contracted products"
  on public.client_products for all to authenticated
  using (exists (select 1 from public.user_profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'gerente')))
  with check (exists (select 1 from public.user_profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'gerente')));

create policy "managers read import batches"
  on public.import_batches for select to authenticated
  using (exists (select 1 from public.user_profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'gerente')));

grant select on public.client_products to authenticated;
grant select on public.import_batches to authenticated;

create or replace function public.import_structured_data(
  p_kind text,
  p_file_name text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  item jsonb;
  imported integer := 0;
  batch_id uuid;
begin
  if actor_id is null or not exists (
    select 1 from public.user_profiles p
    where p.id = actor_id and p.role in ('admin', 'gerente')
  ) then
    raise exception 'Apenas administradores ou gerentes podem importar dados.' using errcode = '42501';
  end if;

  if p_kind not in ('clients', 'people', 'contracts', 'interactions') then
    raise exception 'Modalidade de importação inválida.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 5000 then
    raise exception 'O lote deve conter entre 1 e 5000 linhas.' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(p_rows)
  loop
    case p_kind
      when 'clients' then
        insert into public.clients (name, segment, contract_value, contract_renewal_date, owner_manager_id)
        values (
          trim(item->>'name'), nullif(trim(item->>'segment'), ''),
          nullif(item->>'contract_value', '')::numeric, nullif(item->>'contract_renewal_date', '')::date,
          nullif(item->>'owner_manager_id', '')::uuid
        );
      when 'people' then
        if exists (
          select 1 from public.client_contacts c
          where c.client_id = (item->>'client_id')::uuid
            and (lower(c.email) = lower(item->>'email') or (coalesce(item->>'email', '') = '' and lower(c.name) = lower(item->>'name')))
        ) then
          raise exception 'Contato duplicado: %', item->>'name' using errcode = '23505';
        end if;
        insert into public.client_contacts (client_id, name, role, email, phone, influence)
        values (
          (item->>'client_id')::uuid, trim(item->>'name'), nullif(trim(item->>'role'), ''),
          nullif(lower(trim(item->>'email')), ''), nullif(trim(item->>'phone'), ''),
          coalesce(nullif(item->>'influence', ''), 'media')::public.stakeholder_influence
        );
      when 'contracts' then
        insert into public.client_products (client_id, product_id, contract_value, renewal_date)
        values (
          (item->>'client_id')::uuid, (item->>'product_id')::uuid,
          nullif(item->>'contract_value', '')::numeric, nullif(item->>'renewal_date', '')::date
        );
      when 'interactions' then
        if exists (
          select 1 from public.interactions i
          where i.client_id = (item->>'client_id')::uuid
            and i.product_id = (item->>'product_id')::uuid
            and lower(i.topic) = lower(item->>'topic')
            and i.occurred_at = (item->>'occurred_at')::date
        ) then
          raise exception 'Interação duplicada: %', item->>'topic' using errcode = '23505';
        end if;
        insert into public.interactions (
          client_id, product_id, manager_id, contact_id, interaction_type, topic, notes,
          relevance, occurred_at, created_by
        ) values (
          (item->>'client_id')::uuid, (item->>'product_id')::uuid,
          nullif(item->>'manager_id', '')::uuid, nullif(item->>'contact_id', '')::uuid,
          (item->>'interaction_type')::public.interaction_type, trim(item->>'topic'),
          nullif(trim(item->>'notes'), ''), (item->>'relevance')::smallint,
          (item->>'occurred_at')::date, actor_id
        );
    end case;
    imported := imported + 1;
  end loop;

  insert into public.import_batches (kind, file_name, total_rows, imported_rows, created_by)
  values (p_kind, left(trim(p_file_name), 255), jsonb_array_length(p_rows), imported, actor_id)
  returning id into batch_id;

  return jsonb_build_object('batch_id', batch_id, 'imported_rows', imported);
end;
$$;

revoke all on function public.import_structured_data(text, text, jsonb) from public, anon;
grant execute on function public.import_structured_data(text, text, jsonb) to authenticated;
