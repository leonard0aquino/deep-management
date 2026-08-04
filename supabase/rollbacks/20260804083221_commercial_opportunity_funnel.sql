-- Rollback Story 6.2 — remove somente o domínio novo de oportunidades.

drop table if exists public.commercial_opportunity_stage_events;
drop table if exists public.commercial_opportunities;
drop function if exists private.log_commercial_opportunity_stage();
drop function if exists private.prepare_commercial_opportunity();
drop function if exists private.can_access_commercial_manager(uuid);
drop type if exists public.commercial_opportunity_stage;
