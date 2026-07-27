-- Rollback Story 2.1 — remove somente os artefatos do Plano de Sucesso.

drop table if exists public.client_success_milestones;
drop table if exists public.client_success_plans;
drop function if exists public.set_success_record_updated_by();
drop type if exists public.success_milestone_status;
drop type if exists public.success_plan_status;
