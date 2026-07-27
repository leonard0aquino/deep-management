begin;

drop index if exists public.action_tasks_updated_by_idx;
drop index if exists public.action_tasks_created_by_idx;

commit;
