-- Story 6.9 — permite corrigir prospecções diárias sem revalidar como criação
-- os valores históricos de etapas que deixaram de pertencer ao responsável.

begin;

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
  has_previous_state boolean := false;
  previous_prospecting_count integer;
  previous_meetings_count integer;
  previous_nda_poc_count integer;
  previous_won_count integer;
  previous_last_meeting_on date;
  previous_last_nda_poc_on date;
  previous_last_proposal_on date;
  previous_last_won_on date;
begin
  if caller_id is null then
    raise exception 'Autenticação obrigatória para atualizar o cockpit Comercial.';
  end if;

  if tg_op = 'UPDATE' then
    new.owner_user_id := old.owner_user_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;

    has_previous_state := true;
    previous_prospecting_count := old.prospecting_count;
    previous_meetings_count := old.meetings_count;
    previous_nda_poc_count := old.nda_poc_count;
    previous_won_count := old.won_count;
    previous_last_meeting_on := old.last_meeting_on;
    previous_last_nda_poc_on := old.last_nda_poc_on;
    previous_last_proposal_on := old.last_proposal_on;
    previous_last_won_on := old.last_won_on;
  else
    select
      state.prospecting_count,
      state.meetings_count,
      state.nda_poc_count,
      state.won_count,
      state.last_meeting_on,
      state.last_nda_poc_on,
      state.last_proposal_on,
      state.last_won_on
    into
      previous_prospecting_count,
      previous_meetings_count,
      previous_nda_poc_count,
      previous_won_count,
      previous_last_meeting_on,
      previous_last_nda_poc_on,
      previous_last_proposal_on,
      previous_last_won_on
    from public.commercial_cockpit_states as state
    where state.owner_user_id = new.owner_user_id;

    has_previous_state := found;
  end if;

  select exists (
    select 1 from public.user_profiles as profile
    where profile.id = new.owner_user_id
      and profile.business_area = 'commercial'
  ) into owner_is_commercial;

  if not owner_is_commercial then
    raise exception 'O responsável do cockpit deve pertencer à área Comercial.';
  end if;

  if not has_previous_state then
    if new.prospecting_count <> 0
      and not private.commercial_user_has_stage(new.owner_user_id, 'prospecting') then
      raise exception 'O responsável não possui a etapa Prospecção.';
    end if;
    if (new.meetings_count <> 0 or new.last_meeting_on is not null)
      and not private.commercial_user_has_stage(new.owner_user_id, 'meetings') then
      raise exception 'O responsável não possui a etapa Reuniões agendadas.';
    end if;
    if (new.nda_poc_count <> 0 or new.last_nda_poc_on is not null or new.last_proposal_on is not null)
      and not private.commercial_user_has_stage(new.owner_user_id, 'nda_poc') then
      raise exception 'O responsável não possui a etapa NDA/POC.';
    end if;
    if (new.won_count <> 0 or new.last_won_on is not null)
      and not private.commercial_user_has_stage(new.owner_user_id, 'won') then
      raise exception 'O responsável não possui a etapa Vendas fechadas.';
    end if;
  else
    if new.prospecting_count is distinct from previous_prospecting_count
      and not private.commercial_user_has_stage(new.owner_user_id, 'prospecting') then
      raise exception 'O responsável não possui a etapa Prospecção.';
    end if;
    if (new.meetings_count is distinct from previous_meetings_count
        or new.last_meeting_on is distinct from previous_last_meeting_on)
      and not private.commercial_user_has_stage(new.owner_user_id, 'meetings') then
      raise exception 'O responsável não possui a etapa Reuniões agendadas.';
    end if;
    if (new.nda_poc_count is distinct from previous_nda_poc_count
        or new.last_nda_poc_on is distinct from previous_last_nda_poc_on
        or new.last_proposal_on is distinct from previous_last_proposal_on)
      and not private.commercial_user_has_stage(new.owner_user_id, 'nda_poc') then
      raise exception 'O responsável não possui a etapa NDA/POC.';
    end if;
    if (new.won_count is distinct from previous_won_count
        or new.last_won_on is distinct from previous_last_won_on)
      and not private.commercial_user_has_stage(new.owner_user_id, 'won') then
      raise exception 'O responsável não possui a etapa Vendas fechadas.';
    end if;
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

revoke all on function private.prepare_commercial_cockpit_state()
  from public, anon, authenticated;

comment on function private.prepare_commercial_cockpit_state() is
  'Valida somente alterações reais de etapas em inserts, updates e upserts do cockpit Comercial.';

commit;
