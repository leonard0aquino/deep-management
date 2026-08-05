-- Story 6.5 — remove privilégios implícitos incompatíveis com a agenda sem exclusão física.

revoke all on public.commercial_cockpit_states from public, anon, authenticated;
revoke all on public.commercial_agenda_entries from public, anon, authenticated;

grant select, insert, update on public.commercial_cockpit_states to authenticated;
grant select, insert, update on public.commercial_agenda_entries to authenticated;

grant all on public.commercial_cockpit_states to service_role;
grant all on public.commercial_agenda_entries to service_role;
