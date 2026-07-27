begin;

drop function if exists public.get_assignable_action_users();

drop trigger if exists action_tasks_log_event on public.action_tasks;
drop trigger if exists action_tasks_prepare on public.action_tasks;

drop table if exists public.action_task_events;
drop table if exists public.action_tasks;

drop function if exists private.log_action_task_event();
drop function if exists private.prepare_action_task();
drop function if exists private.is_internal_user();

commit;
