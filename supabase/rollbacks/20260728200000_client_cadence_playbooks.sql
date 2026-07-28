-- Rollback Story 2.5 — remove somente Cadências e Playbooks.

drop view if exists public.client_cadence_progress;
drop function if exists public.apply_customer_playbook(uuid, uuid, uuid, uuid, date);

drop trigger if exists action_tasks_refresh_cadence_status on public.action_tasks;
drop trigger if exists action_tasks_validate_cadence_source on public.action_tasks;
drop function if exists private.refresh_client_cadence_status();
drop function if exists private.validate_cadence_action_task();

alter table public.action_tasks
  drop constraint if exists action_tasks_cadence_source_complete,
  drop column if exists recommended_interaction_type,
  drop column if exists playbook_step_id,
  drop column if exists client_cadence_id;

drop table if exists public.client_cadences;
drop table if exists public.customer_playbook_steps;
drop table if exists public.customer_playbooks;
drop function if exists public.set_playbook_record_updated_by();
drop type if exists public.client_cadence_status;
