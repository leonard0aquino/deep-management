begin;

drop policy if exists "commercial owner creates cockpit states"
  on public.commercial_cockpit_states;
drop policy if exists "commercial owner updates cockpit states"
  on public.commercial_cockpit_states;
drop policy if exists "commercial owner creates agenda"
  on public.commercial_agenda_entries;
drop policy if exists "commercial owner updates agenda"
  on public.commercial_agenda_entries;

drop trigger if exists guard_commercial_cockpit_self_owner
  on public.commercial_cockpit_states;
drop trigger if exists guard_commercial_agenda_self_owner
  on public.commercial_agenda_entries;
drop function if exists private.guard_commercial_self_owner();

create policy "commercial hierarchy creates cockpit states"
on public.commercial_cockpit_states for insert to authenticated
with check (
  (select private.can_access_commercial_user(owner_user_id))
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy "commercial hierarchy updates cockpit states"
on public.commercial_cockpit_states for update to authenticated
using ((select private.can_access_commercial_user(owner_user_id)))
with check (
  (select private.can_access_commercial_user(owner_user_id))
  and updated_by = (select auth.uid())
);

create policy "commercial hierarchy creates agenda"
on public.commercial_agenda_entries for insert to authenticated
with check (
  (select private.can_access_commercial_user(owner_user_id))
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy "commercial hierarchy updates agenda"
on public.commercial_agenda_entries for update to authenticated
using ((select private.can_access_commercial_user(owner_user_id)))
with check (
  (select private.can_access_commercial_user(owner_user_id))
  and updated_by = (select auth.uid())
);

commit;
