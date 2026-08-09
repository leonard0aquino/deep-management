begin;

lock table public.commercial_daily_prospecting in access exclusive mode;

with daily_totals as (
  select owner_user_id, sum(prospecting_count)::integer as prospecting_count
  from public.commercial_daily_prospecting
  group by owner_user_id
)
update public.commercial_cockpit_states as cockpit
set prospecting_count = greatest(0, cockpit.prospecting_count - daily_totals.prospecting_count)
from daily_totals
where cockpit.owner_user_id = daily_totals.owner_user_id;

drop function if exists public.save_commercial_cockpit(
  uuid, integer, integer, integer, integer, date, date, date, date, date, integer
);
drop table if exists public.commercial_daily_prospecting;
drop function if exists private.sync_commercial_daily_prospecting_total();
drop function if exists private.prepare_commercial_daily_prospecting();

commit;
