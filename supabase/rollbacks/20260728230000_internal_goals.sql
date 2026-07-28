-- Rollback Story 4.4 — remove somente as metas internas.

drop table if exists public.internal_goals;
drop function if exists public.set_internal_goal_updated_by();
