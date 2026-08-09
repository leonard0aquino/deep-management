begin;

drop table if exists public.commercial_daily_prospecting;
drop function if exists private.sync_commercial_daily_prospecting_total();
drop function if exists private.prepare_commercial_daily_prospecting();

commit;
