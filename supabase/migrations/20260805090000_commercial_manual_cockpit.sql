-- Story 6.5 — cockpit Comercial manual, auditável e separado do CRM operacional.

create table public.commercial_cockpit_states (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users (id) on delete cascade,
  prospecting_count integer not null default 0 check (prospecting_count >= 0),
  meetings_count integer not null default 0 check (meetings_count >= 0),
  nda_poc_count integer not null default 0 check (nda_poc_count >= 0),
  won_count integer not null default 0 check (won_count >= 0),
  last_meeting_on date,
  last_nda_poc_on date,
  last_proposal_on date,
  last_won_on date,
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.commercial_agenda_entries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null check (char_length(btrim(company_name)) between 2 and 160),
  title text not null check (char_length(btrim(title)) between 2 and 200),
  kind text not null check (kind in ('meeting', 'nda_poc', 'proposal', 'won', 'other')),
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index commercial_cockpit_states_updated_idx
  on public.commercial_cockpit_states (updated_at desc);
create index commercial_cockpit_states_created_by_idx
  on public.commercial_cockpit_states (created_by);
create index commercial_cockpit_states_updated_by_idx
  on public.commercial_cockpit_states (updated_by);
create index commercial_agenda_owner_status_scheduled_idx
  on public.commercial_agenda_entries (owner_user_id, status, scheduled_at);
create index commercial_agenda_status_scheduled_idx
  on public.commercial_agenda_entries (status, scheduled_at);
create index commercial_agenda_created_by_idx
  on public.commercial_agenda_entries (created_by);
create index commercial_agenda_updated_by_idx
  on public.commercial_agenda_entries (updated_by);

alter table public.commercial_cockpit_states enable row level security;
alter table public.commercial_agenda_entries enable row level security;

create or replace function private.prepare_commercial_cockpit_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  owner_is_commercial boolean;
  current_day date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if caller_id is null then
    raise exception 'Autenticação obrigatória para atualizar o cockpit Comercial.';
  end if;

  if tg_op = 'UPDATE' then
    new.owner_user_id := old.owner_user_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;

  select exists (
    select 1 from public.user_profiles as profile
    where profile.id = new.owner_user_id
      and profile.business_area = 'commercial'
  ) into owner_is_commercial;

  if not owner_is_commercial then
    raise exception 'O responsável do cockpit deve pertencer à área Comercial.';
  end if;

  if new.last_meeting_on > current_day
    or new.last_nda_poc_on > current_day
    or new.last_proposal_on > current_day
    or new.last_won_on > current_day then
    raise exception 'Eventos realizados não podem possuir data futura.';
  end if;

  if tg_op = 'INSERT' then
    new.created_by := caller_id;
    new.created_at := now();
  end if;
  new.updated_by := caller_id;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.prepare_commercial_agenda_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  owner_is_commercial boolean;
  scheduled_on date;
  current_day date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if caller_id is null then
    raise exception 'Autenticação obrigatória para atualizar a agenda Comercial.';
  end if;

  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;

  select exists (
    select 1 from public.user_profiles as profile
    where profile.id = new.owner_user_id
      and profile.business_area = 'commercial'
  ) into owner_is_commercial;

  if not owner_is_commercial then
    raise exception 'O responsável da agenda deve pertencer à área Comercial.';
  end if;

  new.company_name := btrim(new.company_name);
  new.title := btrim(new.title);
  scheduled_on := (new.scheduled_at at time zone 'America/Sao_Paulo')::date;

  if new.status = 'completed' then
    if scheduled_on > current_day then
      raise exception 'Um compromisso futuro não pode ser marcado como concluído.';
    end if;
    new.completed_at := case
      when tg_op = 'INSERT' then now()
      else coalesce(old.completed_at, now())
    end;
  else
    new.completed_at := null;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := caller_id;
    new.created_at := now();
  end if;
  new.updated_by := caller_id;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.sync_completed_commercial_agenda_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_on date := (new.scheduled_at at time zone 'America/Sao_Paulo')::date;
  became_completed boolean;
begin
  became_completed := case
    when tg_op = 'INSERT' then true
    else old.status <> 'completed'
  end;

  if new.status = 'completed'
    and became_completed
    and new.kind <> 'other' then
    insert into public.commercial_cockpit_states (
      owner_user_id,
      last_meeting_on,
      last_nda_poc_on,
      last_proposal_on,
      last_won_on,
      created_by,
      updated_by
    ) values (
      new.owner_user_id,
      case when new.kind = 'meeting' then event_on end,
      case when new.kind = 'nda_poc' then event_on end,
      case when new.kind = 'proposal' then event_on end,
      case when new.kind = 'won' then event_on end,
      new.updated_by,
      new.updated_by
    )
    on conflict (owner_user_id) do update set
      last_meeting_on = case when new.kind = 'meeting'
        then greatest(coalesce(commercial_cockpit_states.last_meeting_on, event_on), event_on)
        else commercial_cockpit_states.last_meeting_on end,
      last_nda_poc_on = case when new.kind = 'nda_poc'
        then greatest(coalesce(commercial_cockpit_states.last_nda_poc_on, event_on), event_on)
        else commercial_cockpit_states.last_nda_poc_on end,
      last_proposal_on = case when new.kind = 'proposal'
        then greatest(coalesce(commercial_cockpit_states.last_proposal_on, event_on), event_on)
        else commercial_cockpit_states.last_proposal_on end,
      last_won_on = case when new.kind = 'won'
        then greatest(coalesce(commercial_cockpit_states.last_won_on, event_on), event_on)
        else commercial_cockpit_states.last_won_on end,
      updated_by = new.updated_by,
      updated_at = now();
  end if;
  return new;
end;
$$;

revoke all on function private.prepare_commercial_cockpit_state() from public, anon, authenticated;
revoke all on function private.prepare_commercial_agenda_entry() from public, anon, authenticated;
revoke all on function private.sync_completed_commercial_agenda_entry() from public, anon, authenticated;

create trigger prepare_commercial_cockpit_state
  before insert or update on public.commercial_cockpit_states
  for each row execute function private.prepare_commercial_cockpit_state();
create trigger audit_commercial_cockpit_state
  after insert or update on public.commercial_cockpit_states
  for each row execute function public.audit_trigger();

create trigger prepare_commercial_agenda_entry
  before insert or update on public.commercial_agenda_entries
  for each row execute function private.prepare_commercial_agenda_entry();
create trigger sync_completed_commercial_agenda_entry
  after insert or update on public.commercial_agenda_entries
  for each row execute function private.sync_completed_commercial_agenda_entry();
create trigger audit_commercial_agenda_entry
  after insert or update on public.commercial_agenda_entries
  for each row execute function public.audit_trigger();

create policy "commercial hierarchy reads cockpit states"
on public.commercial_cockpit_states for select to authenticated
using ((select private.can_access_commercial_user(owner_user_id)));

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

create policy "commercial hierarchy reads agenda"
on public.commercial_agenda_entries for select to authenticated
using ((select private.can_access_commercial_user(owner_user_id)));

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

revoke all on public.commercial_cockpit_states from public, anon, authenticated;
revoke all on public.commercial_agenda_entries from public, anon, authenticated;
grant select, insert, update on public.commercial_cockpit_states to authenticated;
grant select, insert, update on public.commercial_agenda_entries to authenticated;
grant all on public.commercial_cockpit_states to service_role;
grant all on public.commercial_agenda_entries to service_role;

comment on table public.commercial_cockpit_states is
  'Estado manual e auditável do cockpit Comercial; não substitui o CRM operacional.';
comment on table public.commercial_agenda_entries is
  'Agenda gerencial manual do Comercial; conclusão sincroniza indicadores de recência.';
