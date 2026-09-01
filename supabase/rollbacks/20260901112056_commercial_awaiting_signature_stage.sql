begin;

do $$
begin
  if exists (
    select 1 from public.commercial_opportunities
    where stage::text = 'awaiting_signature'
  ) or exists (
    select 1 from public.commercial_opportunity_stage_events
    where from_stage::text = 'awaiting_signature'
       or to_stage::text = 'awaiting_signature'
  ) or exists (
    select 1 from public.commercial_cockpit_states
    where awaiting_signature_count <> 0
  ) then
    raise exception 'Rollback bloqueado: existem dados na etapa Chamado aguardando assinatura.';
  end if;
end $$;

drop function if exists public.save_commercial_cockpit(
  uuid, integer, integer, integer, integer, integer, date, date, date, date, date, integer
);

drop trigger if exists guard_commercial_awaiting_signature_count
  on public.commercial_cockpit_states;
drop function if exists private.guard_commercial_awaiting_signature_count();

delete from public.commercial_user_stage_scopes
where stage = 'awaiting_signature';

alter table public.commercial_user_stage_scopes
  drop constraint commercial_user_stage_scopes_stage_check;
alter table public.commercial_user_stage_scopes
  add constraint commercial_user_stage_scopes_stage_check
  check (stage in ('prospecting', 'meetings', 'nda_poc', 'won'));

alter table public.commercial_cockpit_states
  drop column awaiting_signature_count;

-- Garante explicitamente a assinatura anterior, mesmo em ambientes onde o
-- overload legado tenha sido removido após a publicação desta story.
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
    owner_user_id, prospecting_count, meetings_count, nda_poc_count, won_count,
    last_meeting_on, last_nda_poc_on, last_proposal_on, last_won_on,
    created_by, updated_by
  ) values (
    p_owner_user_id, p_prospecting_count, p_meetings_count, p_nda_poc_count, p_won_count,
    p_last_meeting_on, p_last_nda_poc_on, p_last_proposal_on, p_last_won_on,
    caller_id, caller_id
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
      owner_user_id, activity_on, prospecting_count, created_by, updated_by
    ) values (
      p_owner_user_id, p_daily_activity_on, p_daily_prospecting_count, caller_id, caller_id
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

create or replace function private.sync_default_commercial_stage_scopes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := coalesce((select auth.uid()), new.id);
  new_is_commercial boolean := new.business_area = 'commercial' or new.commercial_access;
  old_is_commercial boolean := case
    when tg_op = 'INSERT' then false
    else old.business_area = 'commercial' or old.commercial_access
  end;
begin
  if new_is_commercial and not old_is_commercial then
    insert into public.commercial_user_stage_scopes (
      owner_user_id, stage, active, created_by, updated_by
    )
    select new.id, stage.value, true, actor_id, actor_id
    from (values ('prospecting'), ('meetings'), ('nda_poc'), ('won')) as stage(value)
    on conflict (owner_user_id, stage) do update set
      active = true,
      updated_by = actor_id,
      updated_at = now();
  elsif not new_is_commercial and old_is_commercial then
    update public.commercial_user_stage_scopes
    set active = false,
        updated_by = actor_id,
        updated_at = now()
    where owner_user_id = new.id and active;
  end if;
  return new;
end;
$$;

alter table public.commercial_opportunities
  alter column stage drop default;
alter type public.commercial_opportunity_stage rename to commercial_opportunity_stage_with_signature;
create type public.commercial_opportunity_stage as enum (
  'prospecting', 'meeting', 'qualification', 'nda_poc',
  'proposal', 'negotiation', 'won', 'lost'
);
alter table public.commercial_opportunities
  alter column stage type public.commercial_opportunity_stage
  using stage::text::public.commercial_opportunity_stage;
alter table public.commercial_opportunities
  alter column stage set default 'prospecting';
alter table public.commercial_opportunity_stage_events
  alter column from_stage type public.commercial_opportunity_stage
  using from_stage::text::public.commercial_opportunity_stage,
  alter column to_stage type public.commercial_opportunity_stage
  using to_stage::text::public.commercial_opportunity_stage;
drop type public.commercial_opportunity_stage_with_signature;

commit;
