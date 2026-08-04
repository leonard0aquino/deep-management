-- Complemento Story 6.2 — empresa/contato no funil e autoria própria.

alter table public.commercial_opportunities
  add column if not exists contact_id uuid references public.client_contacts (id) on delete set null;

create index if not exists commercial_opportunities_contact_idx
  on public.commercial_opportunities (contact_id)
  where contact_id is not null;

create or replace function private.validate_commercial_opportunity_contact()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.contact_id is not null and not exists (
    select 1 from public.client_contacts as contact
    where contact.id = new.contact_id and contact.client_id = new.client_id
  ) then
    raise exception 'O contato selecionado não pertence à empresa da oportunidade.';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_commercial_opportunity_contact() from public, anon, authenticated;

drop trigger if exists commercial_opportunities_validate_contact on public.commercial_opportunities;
create trigger commercial_opportunities_validate_contact
before insert or update of client_id, contact_id on public.commercial_opportunities
for each row execute function private.validate_commercial_opportunity_contact();

drop policy if exists "commercial users create prospects" on public.clients;
create policy "commercial users create prospects"
on public.clients for insert to authenticated
with check (
  client_kind = 'prospect'
  and active
  and owner_manager_id is null
  and contract_value is null
  and contract_renewal_date is null
  and exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.business_area = 'commercial'
  )
);

grant insert on public.clients to authenticated;

create or replace function private.is_current_commercial_manager(target_manager_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.deep_managers as manager
    join public.user_profiles as profile on profile.id = manager.linked_user_id
    where manager.id = target_manager_id
      and manager.linked_user_id = (select auth.uid())
      and manager.active
      and profile.business_area = 'commercial'
  );
$$;

revoke all on function private.is_current_commercial_manager(uuid) from public, anon;
grant execute on function private.is_current_commercial_manager(uuid) to authenticated, service_role;

drop policy if exists "commercial hierarchy creates opportunities" on public.commercial_opportunities;
create policy "commercial user creates own opportunities"
on public.commercial_opportunities for insert to authenticated
with check ((select private.is_current_commercial_manager(owner_manager_id)));
