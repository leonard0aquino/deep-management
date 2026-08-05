begin;

create or replace function private.guard_commercial_self_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Autenticação obrigatória para registrar dados Comerciais.';
  end if;

  if tg_op = 'UPDATE' and new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'O responsável Comercial não pode ser alterado.';
  end if;

  if new.owner_user_id is distinct from caller_id then
    raise exception 'O responsável Comercial deve ser o usuário autenticado.';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_commercial_self_owner()
  from public, anon, authenticated;

create trigger guard_commercial_cockpit_self_owner
  before insert or update on public.commercial_cockpit_states
  for each row execute function private.guard_commercial_self_owner();

create trigger guard_commercial_agenda_self_owner
  before insert or update on public.commercial_agenda_entries
  for each row execute function private.guard_commercial_self_owner();

drop policy if exists "commercial hierarchy creates cockpit states"
  on public.commercial_cockpit_states;
drop policy if exists "commercial hierarchy updates cockpit states"
  on public.commercial_cockpit_states;
drop policy if exists "commercial hierarchy creates agenda"
  on public.commercial_agenda_entries;
drop policy if exists "commercial hierarchy updates agenda"
  on public.commercial_agenda_entries;

create policy "commercial owner creates cockpit states"
on public.commercial_cockpit_states for insert to authenticated
with check (
  owner_user_id = (select auth.uid())
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy "commercial owner updates cockpit states"
on public.commercial_cockpit_states for update to authenticated
using (owner_user_id = (select auth.uid()))
with check (
  owner_user_id = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy "commercial owner creates agenda"
on public.commercial_agenda_entries for insert to authenticated
with check (
  owner_user_id = (select auth.uid())
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy "commercial owner updates agenda"
on public.commercial_agenda_entries for update to authenticated
using (owner_user_id = (select auth.uid()))
with check (
  owner_user_id = (select auth.uid())
  and updated_by = (select auth.uid())
);

comment on function private.guard_commercial_self_owner() is
  'Impede criação, transferência ou atualização de cockpit e agenda Comercial em nome de outro usuário.';

commit;
