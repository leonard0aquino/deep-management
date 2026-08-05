do $$
begin
  if exists (select 1 from public.commercial_opportunities where owner_manager_id is null) then
    raise exception 'Rollback bloqueado: existem oportunidades Comerciais sem gestor vinculado.';
  end if;
end $$;

drop policy if exists "commercial hierarchy reads opportunity events" on public.commercial_opportunity_stage_events;
create policy "commercial hierarchy reads opportunity events"
on public.commercial_opportunity_stage_events for select to authenticated
using (exists (
  select 1 from public.commercial_opportunities as opportunity
  where opportunity.id = opportunity_id
    and (select private.can_access_commercial_manager(opportunity.owner_manager_id))
));

drop policy if exists "commercial hierarchy updates opportunities" on public.commercial_opportunities;
create policy "commercial hierarchy updates opportunities"
on public.commercial_opportunities for update to authenticated
using ((select private.can_access_commercial_manager(owner_manager_id)))
with check ((select private.can_access_commercial_manager(owner_manager_id)));

drop policy if exists "commercial user creates own opportunities" on public.commercial_opportunities;
create policy "commercial user creates own opportunities"
on public.commercial_opportunities for insert to authenticated
with check ((select private.is_current_commercial_manager(owner_manager_id)));

drop policy if exists "commercial hierarchy reads opportunities" on public.commercial_opportunities;
create policy "commercial hierarchy reads opportunities"
on public.commercial_opportunities for select to authenticated
using ((select private.can_access_commercial_manager(owner_manager_id)));

drop function if exists private.can_access_commercial_user(uuid);

alter table public.commercial_opportunities
  alter column owner_manager_id set not null;
