-- Story 6.9 — sincroniza o total diário por UPDATE quando o cockpit já existe,
-- evitando que um INSERT parcial revalide etapas históricas não alteradas.

begin;

create or replace function private.sync_commercial_daily_prospecting_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  count_delta integer;
begin
  if tg_op = 'DELETE' then
    update public.commercial_cockpit_states
    set
      prospecting_count = greatest(0, prospecting_count - old.prospecting_count),
      updated_by = coalesce((select auth.uid()), old.updated_by),
      updated_at = now()
    where owner_user_id = old.owner_user_id;
    return old;
  end if;

  count_delta := new.prospecting_count - case when tg_op = 'UPDATE' then old.prospecting_count else 0 end;

  update public.commercial_cockpit_states
  set
    prospecting_count = greatest(0, prospecting_count + count_delta),
    updated_by = new.updated_by,
    updated_at = now()
  where owner_user_id = new.owner_user_id;

  if not found then
    insert into public.commercial_cockpit_states (
      owner_user_id,
      prospecting_count,
      created_by,
      updated_by
    ) values (
      new.owner_user_id,
      new.prospecting_count,
      new.updated_by,
      new.updated_by
    );
  end if;

  return new;
end;
$$;

revoke all on function private.sync_commercial_daily_prospecting_total()
  from public, anon, authenticated;

comment on function private.sync_commercial_daily_prospecting_total() is
  'Sincroniza prospecções diárias por diferença sem reconstruir etapas históricas do cockpit.';

commit;
