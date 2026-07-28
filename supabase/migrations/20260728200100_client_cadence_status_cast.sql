-- Story 2.5 — corrige a tipagem explícita do enum no recálculo da cadência.

create or replace function private.refresh_client_cadence_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cadence_id uuid := coalesce(new.client_cadence_id, old.client_cadence_id);
  has_open_tasks boolean;
begin
  if cadence_id is null then
    return new;
  end if;

  select exists (
    select 1
    from public.action_tasks task
    where task.client_cadence_id = cadence_id
      and task.status in ('pending', 'in_progress', 'postponed')
  ) into has_open_tasks;

  update public.client_cadences
  set status = case
        when has_open_tasks then 'active'::public.client_cadence_status
        else 'completed'::public.client_cadence_status
      end,
      completed_at = case when has_open_tasks then null else coalesce(completed_at, now()) end
  where id = cadence_id;

  return new;
end;
$$;

revoke all on function private.refresh_client_cadence_status() from public, anon, authenticated;
