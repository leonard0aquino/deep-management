-- Rollback Story 4.6 — restaura importação e modelo anterior de responsabilidade.

begin;

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

drop index if exists public.client_products_owner_manager_id_idx;
alter table public.client_products drop column if exists owner_manager_id;

revoke all on public.client_products from anon, authenticated;
grant select, insert, update, delete on public.client_products to authenticated;
grant all on public.client_products to service_role;

commit;
