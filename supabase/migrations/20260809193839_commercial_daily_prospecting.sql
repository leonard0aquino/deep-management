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
  count_delta integer := new.prospecting_count - case when tg_op = 'UPDATE' then old.prospecting_count else 0 end;
begin
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
  after insert or update on public.commercial_daily_prospecting
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

comment on table public.commercial_daily_prospecting is
  'Histórico diário self-owner de prospecções; alterações sincronizam o total legado do cockpit por diferença.';

commit;
