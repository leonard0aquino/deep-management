begin;

do $$
begin
  if exists (
    select 1
    from public.commercial_user_stage_scopes as scope
    join public.user_profiles as profile on profile.id = scope.owner_user_id
    where profile.business_area = 'commercial'
    group by scope.owner_user_id
    having count(*) filter (where scope.active) <> 4
  ) then
    raise exception 'Rollback bloqueado: existem responsabilidades Comerciais personalizadas.';
  end if;
end $$;

drop trigger if exists sync_default_commercial_stage_scopes on public.user_profiles;
drop trigger if exists audit_commercial_stage_scope on public.commercial_user_stage_scopes;
drop trigger if exists prepare_commercial_stage_scope on public.commercial_user_stage_scopes;

-- Restaura as proteções do cockpit anteriores à responsabilidade por etapa.
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

drop table public.commercial_user_stage_scopes;
drop function if exists private.sync_default_commercial_stage_scopes();
drop function if exists private.prepare_commercial_stage_scope();
drop function if exists private.commercial_user_has_stage(uuid, text);

commit;
