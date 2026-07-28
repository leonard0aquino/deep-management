-- Story 3.4 — Eventos recebidos pela API interna

create table public.internal_api_events (
  id uuid primary key default gen_random_uuid(),
  source text not null check (length(trim(source)) between 2 and 80),
  event_type text not null check (length(trim(event_type)) between 2 and 120),
  external_key text not null check (length(trim(external_key)) between 1 and 200),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  api_key_id uuid not null references public.api_keys (id) on delete restrict,
  received_at timestamptz not null default now(),
  unique (source, external_key)
);

create index internal_api_events_type_received_idx on public.internal_api_events (event_type, received_at desc);
alter table public.internal_api_events enable row level security;
revoke all on table public.internal_api_events from anon, authenticated;

create or replace function public.api_create_action(p_api_key_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  created public.action_tasks;
begin
  select key.created_by into actor_id from public.api_keys key
  where key.id = p_api_key_id and not key.revoked;
  if actor_id is null or not exists (select 1 from public.user_profiles p where p.id = actor_id) then
    raise exception 'valid API actor required' using errcode = '42501';
  end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', actor_id, 'role', 'authenticated')::text, true);
  insert into public.action_tasks (action_key, client_id, client_name, product_id, product_name, priority, reason, status, assigned_to, due_date, justification, result)
  values (
    trim(p_payload->>'action_key'), (p_payload->>'client_id')::uuid, '-', (p_payload->>'product_id')::uuid, '-',
    p_payload->>'priority', trim(p_payload->>'reason'), coalesce(nullif(p_payload->>'status', ''), 'pending'),
    nullif(p_payload->>'assigned_to', '')::uuid, (p_payload->>'due_date')::date,
    nullif(trim(p_payload->>'justification'), ''), nullif(trim(p_payload->>'result'), '')
  ) returning * into created;
  return to_jsonb(created);
end;
$$;

create or replace function public.api_update_action(p_api_key_id uuid, p_action_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  current_task public.action_tasks;
  updated public.action_tasks;
begin
  select key.created_by into actor_id from public.api_keys key
  where key.id = p_api_key_id and not key.revoked;
  if actor_id is null or not exists (select 1 from public.user_profiles p where p.id = actor_id) then
    raise exception 'valid API actor required' using errcode = '42501';
  end if;
  select * into current_task from public.action_tasks where id = p_action_id;
  if current_task.id is null then raise exception 'action not found' using errcode = 'P0002'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', actor_id, 'role', 'authenticated')::text, true);
  update public.action_tasks set
    priority = case when p_payload ? 'priority' then p_payload->>'priority' else current_task.priority end,
    reason = case when p_payload ? 'reason' then trim(p_payload->>'reason') else current_task.reason end,
    status = case when p_payload ? 'status' then p_payload->>'status' else current_task.status end,
    assigned_to = case when p_payload ? 'assigned_to' then nullif(p_payload->>'assigned_to', '')::uuid else current_task.assigned_to end,
    due_date = case when p_payload ? 'due_date' then (p_payload->>'due_date')::date else current_task.due_date end,
    justification = case when p_payload ? 'justification' then nullif(trim(p_payload->>'justification'), '') else current_task.justification end,
    result = case when p_payload ? 'result' then nullif(trim(p_payload->>'result'), '') else current_task.result end
  where id = p_action_id returning * into updated;
  return to_jsonb(updated);
end;
$$;

revoke all on function public.api_create_action(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.api_update_action(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.api_create_action(uuid, jsonb) to service_role;
grant execute on function public.api_update_action(uuid, uuid, jsonb) to service_role;
