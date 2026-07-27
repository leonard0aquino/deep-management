begin;

create index if not exists action_tasks_created_by_idx
  on public.action_tasks (created_by);

create index if not exists action_tasks_updated_by_idx
  on public.action_tasks (updated_by);

commit;
