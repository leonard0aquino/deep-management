do $$
begin
  if exists (select 1 from public.commercial_cockpit_states)
    or exists (select 1 from public.commercial_agenda_entries) then
    raise exception 'Rollback bloqueado: existem dados manuais no cockpit Comercial.';
  end if;
end $$;

drop trigger if exists audit_commercial_agenda_entry on public.commercial_agenda_entries;
drop trigger if exists sync_completed_commercial_agenda_entry on public.commercial_agenda_entries;
drop trigger if exists prepare_commercial_agenda_entry on public.commercial_agenda_entries;
drop trigger if exists audit_commercial_cockpit_state on public.commercial_cockpit_states;
drop trigger if exists prepare_commercial_cockpit_state on public.commercial_cockpit_states;

drop table if exists public.commercial_agenda_entries;
drop table if exists public.commercial_cockpit_states;

drop function if exists private.sync_completed_commercial_agenda_entry();
drop function if exists private.prepare_commercial_agenda_entry();
drop function if exists private.prepare_commercial_cockpit_state();
