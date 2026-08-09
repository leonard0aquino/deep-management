-- Story 6.9 — histórico diário de prospecções por analista.

begin;

create table public.commercial_daily_prospecting (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  activity_on date not null,
  prospecting_count integer not null default 0 check (prospecting_count >= 0),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, activity_on)
);

create index commercial_daily_prospecting_activity_idx
  on public.commercial_daily_prospecting (activity_on desc, owner_user_id);
create index commercial_daily_prospecting_created_by_idx
  on public.commercial_daily_prospecting (created_by);
create index commercial_daily_prospecting_updated_by_idx
  on public.commercial_daily_prospecting (updated_by);

alter table public.commercial_daily_prospecting enable row level security;

create or replace function private.prepare_commercial_daily_prospecting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  current_day date := (now() at time zone 'America/Sao_Paulo')::date;
  owner_is_eligible boolean;
begin
  if caller_id is null then
    raise exception 'Autenticação obrigatória para registrar prospecções diárias.';
  end if;

  if tg_op = 'UPDATE' then
    if new.owner_user_id is distinct from old.owner_user_id then
      raise exception 'O responsável pela prospecção diária não pode ser alterado.';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;

  if new.owner_user_id is distinct from caller_id then
    raise exception 'A prospecção diária deve pertencer ao usuário autenticado.';
  end if;

  select exists (
    select 1
    from public.user_profiles as profile
    where profile.id = new.owner_user_id
      and profile.business_area = 'commercial'
      and profile.role::text = 'analista'
      and private.commercial_user_has_stage(profile.id, 'prospecting')
  ) into owner_is_eligible;

  if not owner_is_eligible then
    raise exception 'Somente analistas com a etapa Prospecção ativa podem registrar o histórico diário.';
  end if;

  if new.activity_on > current_day then
    raise exception 'Prospecções realizadas não podem possuir data futura.';
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
  )
  on conflict (owner_user_id) do update set
    prospecting_count = greatest(0, commercial_cockpit_states.prospecting_count + count_delta),
    updated_by = new.updated_by,
    updated_at = now();

  return new;
end;
$$;

revoke all on function private.prepare_commercial_daily_prospecting()
  from public, anon, authenticated;
revoke all on function private.sync_commercial_daily_prospecting_total()
  from public, anon, authenticated;

create trigger prepare_commercial_daily_prospecting
  before insert or update on public.commercial_daily_prospecting
  for each row execute function private.prepare_commercial_daily_prospecting();
create trigger sync_commercial_daily_prospecting_total
  after insert or update or delete on public.commercial_daily_prospecting
  for each row execute function private.sync_commercial_daily_prospecting_total();
create trigger audit_commercial_daily_prospecting
  after insert or update on public.commercial_daily_prospecting
  for each row execute function public.audit_trigger();

create policy "commercial hierarchy reads daily prospecting"
on public.commercial_daily_prospecting for select to authenticated
using ((select private.can_access_commercial_user(owner_user_id)));

create policy "commercial owner creates daily prospecting"
on public.commercial_daily_prospecting for insert to authenticated
with check (
  owner_user_id = (select auth.uid())
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy "commercial owner updates daily prospecting"
on public.commercial_daily_prospecting for update to authenticated
using (owner_user_id = (select auth.uid()))
with check (
  owner_user_id = (select auth.uid())
  and updated_by = (select auth.uid())
);

revoke all on public.commercial_daily_prospecting from public, anon, authenticated;
grant select, insert, update on public.commercial_daily_prospecting to authenticated;
grant all on public.commercial_daily_prospecting to service_role;

create or replace function public.save_commercial_cockpit(
  p_owner_user_id uuid,
  p_prospecting_count integer,
  p_meetings_count integer,
  p_nda_poc_count integer,
  p_won_count integer,
  p_last_meeting_on date,
  p_last_nda_poc_on date,
  p_last_proposal_on date,
  p_last_won_on date,
  p_daily_activity_on date,
  p_daily_prospecting_count integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or p_owner_user_id is distinct from caller_id then
    raise exception 'O painel Comercial deve pertencer ao usuário autenticado.';
  end if;

  if (p_daily_activity_on is null) <> (p_daily_prospecting_count is null) then
    raise exception 'Data e quantidade de prospecções diárias devem ser informadas juntas.';
  end if;

  insert into public.commercial_cockpit_states (
    owner_user_id,
    prospecting_count,
    meetings_count,
    nda_poc_count,
    won_count,
    last_meeting_on,
    last_nda_poc_on,
    last_proposal_on,
    last_won_on,
    created_by,
    updated_by
  ) values (
    p_owner_user_id,
    p_prospecting_count,
    p_meetings_count,
    p_nda_poc_count,
    p_won_count,
    p_last_meeting_on,
    p_last_nda_poc_on,
    p_last_proposal_on,
    p_last_won_on,
    caller_id,
    caller_id
  )
  on conflict (owner_user_id) do update set
    prospecting_count = case
      when p_daily_activity_on is null then excluded.prospecting_count
      else commercial_cockpit_states.prospecting_count
    end,
    meetings_count = excluded.meetings_count,
    nda_poc_count = excluded.nda_poc_count,
    won_count = excluded.won_count,
    last_meeting_on = excluded.last_meeting_on,
    last_nda_poc_on = excluded.last_nda_poc_on,
    last_proposal_on = excluded.last_proposal_on,
    last_won_on = excluded.last_won_on,
    updated_by = caller_id,
    updated_at = now();

  if p_daily_activity_on is not null then
    insert into public.commercial_daily_prospecting (
      owner_user_id,
      activity_on,
      prospecting_count,
      created_by,
      updated_by
    ) values (
      p_owner_user_id,
      p_daily_activity_on,
      p_daily_prospecting_count,
      caller_id,
      caller_id
    )
    on conflict (owner_user_id, activity_on) do update set
      prospecting_count = excluded.prospecting_count,
      updated_by = caller_id,
      updated_at = now();
  end if;
end;
$$;

revoke all on function public.save_commercial_cockpit(
  uuid, integer, integer, integer, integer, date, date, date, date, date, integer
) from public, anon;
grant execute on function public.save_commercial_cockpit(
  uuid, integer, integer, integer, integer, date, date, date, date, date, integer
) to authenticated;

comment on table public.commercial_daily_prospecting is
  'Histórico diário self-owner de prospecções; alterações sincronizam o total legado do cockpit por diferença.';
comment on function public.save_commercial_cockpit(
  uuid, integer, integer, integer, integer, date, date, date, date, date, integer
) is 'Salva o cockpit e o histórico diário de prospecção atomicamente, respeitando RLS self-owner.';

commit;
