begin;

drop trigger if exists audit_action_decisions on public.action_decisions;
drop trigger if exists action_decisions_set_updated_at on public.action_decisions;
drop table if exists public.action_decisions;

commit;
