-- Story 6.6 — responsabilidade governada por etapa do cockpit Comercial.

begin;

create table public.commercial_user_stage_scopes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  stage text not null check (stage in ('prospecting', 'meetings', 'nda_poc', 'won')),
  active boolean not null default true,
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, stage)
);

create index commercial_stage_scopes_active_owner_idx
  on public.commercial_user_stage_scopes (owner_user_id)
  where active;
create index commercial_stage_scopes_updated_by_idx
  on public.commercial_user_stage_scopes (updated_by);

alter table public.commercial_user_stage_scopes enable row level security;

insert into public.commercial_user_stage_scopes (
  owner_user_id,
  stage,
  created_by,
  updated_by
)
select profile.id, stage.value, profile.id, profile.id
from public.user_profiles as profile
cross join (
  values ('prospecting'), ('meetings'), ('nda_poc'), ('won')
) as stage(value)
where profile.business_area = 'commercial';

create or replace function private.commercial_user_has_stage(
  target_user_id uuid,
  target_stage text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.commercial_user_stage_scopes as scope
    where scope.owner_user_id = target_user_id
      and scope.stage = target_stage
      and scope.active
  );
$$;

revoke all on function private.commercial_user_has_stage(uuid, text)
  from public, anon, authenticated;

create or replace function private.prepare_commercial_stage_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  owner_is_commercial boolean;
begin
  if caller_id is null and pg_trigger_depth() > 1 then
    caller_id := new.updated_by;
  end if;

  if caller_id is null then
    raise exception 'Autenticação obrigatória para configurar etapas Comerciais.';
  end if;

  if tg_op = 'UPDATE' then
    new.owner_user_id := old.owner_user_id;
    new.stage := old.stage;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;

  select exists (
    select 1
    from public.user_profiles as profile
    where profile.id = new.owner_user_id
      and profile.business_area = 'commercial'
  ) into owner_is_commercial;

  if not owner_is_commercial and (tg_op = 'INSERT' or new.active) then
    raise exception 'Etapas Comerciais só podem ser ativadas para usuários da área Comercial.';
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

revoke all on function private.prepare_commercial_stage_scope()
  from public, anon, authenticated;

create trigger prepare_commercial_stage_scope
  before insert or update on public.commercial_user_stage_scopes
  for each row execute function private.prepare_commercial_stage_scope();
create trigger audit_commercial_stage_scope
  after insert or update on public.commercial_user_stage_scopes
  for each row execute function public.audit_trigger();

create or replace function private.sync_default_commercial_stage_scopes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := coalesce((select auth.uid()), new.id);
begin
  if new.business_area = 'commercial'
    and (tg_op = 'INSERT' or old.business_area is distinct from new.business_area) then
    insert into public.commercial_user_stage_scopes (
      owner_user_id,
      stage,
      active,
      created_by,
      updated_by
    )
    select new.id, stage.value, true, actor_id, actor_id
    from (
      values ('prospecting'), ('meetings'), ('nda_poc'), ('won')
    ) as stage(value)
    on conflict (owner_user_id, stage) do update set
      active = true,
      updated_by = actor_id,
      updated_at = now();
  elsif new.business_area <> 'commercial'
    and tg_op = 'UPDATE'
    and old.business_area is distinct from new.business_area then
    update public.commercial_user_stage_scopes
    set active = false,
        updated_by = actor_id,
        updated_at = now()
    where owner_user_id = new.id
      and active;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_default_commercial_stage_scopes()
  from public, anon, authenticated;

create trigger sync_default_commercial_stage_scopes
  after insert or update of business_area on public.user_profiles
  for each row execute function private.sync_default_commercial_stage_scopes();

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

  if tg_op = 'INSERT' then
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
    if new.prospecting_count is distinct from old.prospecting_count
      and not private.commercial_user_has_stage(new.owner_user_id, 'prospecting') then
      raise exception 'O responsável não possui a etapa Prospecção.';
    end if;
    if (new.meetings_count is distinct from old.meetings_count
        or new.last_meeting_on is distinct from old.last_meeting_on)
      and not private.commercial_user_has_stage(new.owner_user_id, 'meetings') then
      raise exception 'O responsável não possui a etapa Reuniões agendadas.';
    end if;
    if (new.nda_poc_count is distinct from old.nda_poc_count
        or new.last_nda_poc_on is distinct from old.last_nda_poc_on
        or new.last_proposal_on is distinct from old.last_proposal_on)
      and not private.commercial_user_has_stage(new.owner_user_id, 'nda_poc') then
      raise exception 'O responsável não possui a etapa NDA/POC.';
    end if;
    if (new.won_count is distinct from old.won_count
        or new.last_won_on is distinct from old.last_won_on)
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

create or replace function private.prepare_commercial_agenda_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  owner_is_commercial boolean;
  required_stage text;
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

  required_stage := case new.kind
    when 'meeting' then 'meetings'
    when 'nda_poc' then 'nda_poc'
    when 'proposal' then 'nda_poc'
    when 'won' then 'won'
    else null
  end;
  if required_stage is not null
    and not private.commercial_user_has_stage(new.owner_user_id, required_stage) then
    raise exception 'O responsável não possui a etapa exigida por este compromisso.';
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

create policy "commercial hierarchy reads stage scopes"
on public.commercial_user_stage_scopes for select to authenticated
using ((select private.can_access_commercial_user(owner_user_id)));

create policy "admin creates commercial stage scopes"
on public.commercial_user_stage_scopes for insert to authenticated
with check (
  (select public.is_admin())
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy "admin updates commercial stage scopes"
on public.commercial_user_stage_scopes for update to authenticated
using ((select public.is_admin()))
with check (
  (select public.is_admin())
  and updated_by = (select auth.uid())
);

revoke all on public.commercial_user_stage_scopes from public, anon, authenticated;
grant select, insert, update on public.commercial_user_stage_scopes to authenticated;
grant all on public.commercial_user_stage_scopes to service_role;

comment on table public.commercial_user_stage_scopes is
  'Atribuições auditáveis das etapas do cockpit manual por usuário Comercial.';

commit;
