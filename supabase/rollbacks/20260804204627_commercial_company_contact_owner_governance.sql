drop policy if exists "commercial user creates own opportunities" on public.commercial_opportunities;
create policy "commercial hierarchy creates opportunities"
on public.commercial_opportunities for insert to authenticated
with check ((select private.can_access_commercial_manager(owner_manager_id)));

drop function if exists private.is_current_commercial_manager(uuid);
drop trigger if exists commercial_opportunities_validate_contact on public.commercial_opportunities;
drop function if exists private.validate_commercial_opportunity_contact();
drop policy if exists "commercial users create prospects" on public.clients;
drop index if exists public.commercial_opportunities_contact_idx;
alter table public.commercial_opportunities drop column if exists contact_id;
