begin;
drop table if exists public.saved_dashboard_views;
drop function if exists public.ensure_single_default_dashboard_view();
commit;
