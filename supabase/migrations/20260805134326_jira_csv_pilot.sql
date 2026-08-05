-- Story 7.1 — Painel de execução Jira por importação CSV.

create table public.jira_projects (
  id uuid primary key default gen_random_uuid(),
  project_key text not null unique check (project_key ~ '^[A-Z][A-Z0-9_]{1,15}$'),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jira_issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.jira_projects (id) on delete cascade,
  issue_key text not null check (btrim(issue_key) <> ''),
  jira_issue_id text,
  summary text not null,
  issue_type text not null,
  status text not null,
  status_category text not null,
  priority text,
  resolution text,
  assignee_name text,
  assignee_account_id text,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  source_resolved_at timestamptz,
  due_at date,
  parent_key text,
  active boolean not null default true,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, issue_key)
);

create table public.jira_import_batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.jira_projects (id) on delete restrict,
  file_name text not null,
  total_rows integer not null check (total_rows >= 0),
  inserted_rows integer not null check (inserted_rows >= 0),
  updated_rows integer not null check (updated_rows >= 0),
  imported_by uuid not null references auth.users (id) on delete restrict,
  imported_at timestamptz not null default now()
);

create index jira_issues_project_status_idx on public.jira_issues (project_id, status);
create index jira_issues_project_assignee_idx on public.jira_issues (project_id, assignee_account_id);
create index jira_issues_project_updated_idx on public.jira_issues (project_id, source_updated_at desc);
create index jira_issues_open_due_idx on public.jira_issues (project_id, due_at)
  where status_category <> 'Itens concluídos';
create index jira_import_batches_project_imported_idx on public.jira_import_batches (project_id, imported_at desc);

alter table public.jira_projects enable row level security;
alter table public.jira_issues enable row level security;
alter table public.jira_import_batches enable row level security;

create policy "authenticated read jira projects" on public.jira_projects
  for select to authenticated using (
    exists (select 1 from public.user_profiles profile where profile.id = (select auth.uid()) and profile.role in ('admin', 'executivo', 'gerente', 'supervisor'))
  );
create policy "admin writes jira projects" on public.jira_projects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "authenticated read jira issues" on public.jira_issues
  for select to authenticated using (
    exists (select 1 from public.user_profiles profile where profile.id = (select auth.uid()) and profile.role in ('admin', 'executivo', 'gerente', 'supervisor'))
  );
create policy "admin inserts jira issues" on public.jira_issues
  for insert to authenticated with check (public.is_admin());
create policy "admin updates jira issues" on public.jira_issues
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "authenticated read jira import batches" on public.jira_import_batches
  for select to authenticated using (
    exists (select 1 from public.user_profiles profile where profile.id = (select auth.uid()) and profile.role in ('admin', 'executivo', 'gerente', 'supervisor'))
  );
create policy "admin inserts jira import batches" on public.jira_import_batches
  for insert to authenticated with check (public.is_admin() and imported_by = (select auth.uid()));

revoke all on public.jira_projects, public.jira_issues, public.jira_import_batches from anon, authenticated;
grant select on public.jira_projects, public.jira_issues, public.jira_import_batches to authenticated;
grant insert, update on public.jira_projects, public.jira_issues to authenticated;
grant insert on public.jira_import_batches to authenticated;
grant all on public.jira_projects, public.jira_issues, public.jira_import_batches to service_role;

insert into public.jira_projects (project_key, name)
values
  ('SIN', 'Sinergia'),
  ('SIG', 'Sigma'),
  ('DB', 'B.U.s DEEP'),
  ('HP', 'Hiperpag')
on conflict (project_key) do update set name = excluded.name, active = true, updated_at = now();

create or replace function public.import_jira_issues(
  p_project_key text,
  p_project_name text,
  p_file_name text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_project_id uuid;
  v_total integer;
  v_existing integer;
  v_batch_id uuid;
begin
  if v_user_id is null or not public.is_admin() then
    raise exception 'Apenas administradores podem importar dados do Jira.' using errcode = '42501';
  end if;
  if p_project_key !~ '^[A-Z][A-Z0-9_]{1,15}$' then
    raise exception 'Chave de projeto inválida.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'O lote deve ser um array JSON.' using errcode = '22023';
  end if;

  v_total := jsonb_array_length(p_rows);
  if v_total < 1 or v_total > 5000 then
    raise exception 'O lote deve conter entre 1 e 5.000 cards.' using errcode = '22023';
  end if;
  if (
    select count(*) <> count(distinct item->>'issue_key')
    from jsonb_array_elements(p_rows) as item
  ) then
    raise exception 'O lote contém chaves duplicadas.' using errcode = '22023';
  end if;

  insert into public.jira_projects (project_key, name, active, updated_at)
  values (p_project_key, p_project_name, true, now())
  on conflict (project_key) do update
    set name = excluded.name, active = true, updated_at = now()
  returning id into v_project_id;

  perform pg_advisory_xact_lock(hashtextextended(v_project_id::text, 0));

  select count(*) into v_existing
  from public.jira_issues issue
  where issue.project_id = v_project_id
    and issue.issue_key in (select item->>'issue_key' from jsonb_array_elements(p_rows) as item);

  update public.jira_issues
  set active = false, updated_at = now()
  where project_id = v_project_id and active;

  insert into public.jira_issues (
    project_id, issue_key, jira_issue_id, summary, issue_type, status, status_category,
    priority, resolution, assignee_name, assignee_account_id, source_created_at,
    source_updated_at, source_resolved_at, due_at, parent_key, active, imported_at, updated_at
  )
  select
    v_project_id, row.issue_key, row.jira_issue_id, row.summary, row.issue_type,
    row.status, row.status_category, row.priority, row.resolution, row.assignee_name,
    row.assignee_account_id, nullif(row.source_created_at, '')::timestamptz,
    nullif(row.source_updated_at, '')::timestamptz,
    nullif(row.source_resolved_at, '')::timestamptz,
    nullif(row.due_at, '')::date, nullif(row.parent_key, ''), true, now(), now()
  from jsonb_to_recordset(p_rows) as row(
    issue_key text, jira_issue_id text, summary text, issue_type text, status text,
    status_category text, priority text, resolution text, assignee_name text,
    assignee_account_id text, source_created_at text, source_updated_at text,
    source_resolved_at text, due_at text, parent_key text
  )
  on conflict (project_id, issue_key) do update set
    jira_issue_id = excluded.jira_issue_id,
    summary = excluded.summary,
    issue_type = excluded.issue_type,
    status = excluded.status,
    status_category = excluded.status_category,
    priority = excluded.priority,
    resolution = excluded.resolution,
    assignee_name = excluded.assignee_name,
    assignee_account_id = excluded.assignee_account_id,
    source_created_at = excluded.source_created_at,
    source_updated_at = excluded.source_updated_at,
    source_resolved_at = excluded.source_resolved_at,
    due_at = excluded.due_at,
    parent_key = excluded.parent_key,
    active = true,
    imported_at = now(),
    updated_at = now();

  insert into public.jira_import_batches (
    project_id, file_name, total_rows, inserted_rows, updated_rows, imported_by
  ) values (
    v_project_id, coalesce(nullif(trim(p_file_name), ''), 'jira.csv'),
    v_total, v_total - v_existing, v_existing, v_user_id
  ) returning id into v_batch_id;

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'total_rows', v_total,
    'inserted_rows', v_total - v_existing,
    'updated_rows', v_existing
  );
end;
$$;

revoke all on function public.import_jira_issues(text, text, text, jsonb) from public, anon;
grant execute on function public.import_jira_issues(text, text, text, jsonb) to authenticated, service_role;

comment on table public.jira_issues is
  'Snapshot operacional de cards Jira importados por CSV; uma linha por projeto e chave externa.';
comment on table public.jira_import_batches is
  'Trilha de auditoria das importações manuais do Jira.';
