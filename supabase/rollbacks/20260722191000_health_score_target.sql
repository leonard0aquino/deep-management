begin;

alter table public.health_score_settings
  drop constraint if exists health_score_settings_target_range;
alter table public.health_score_settings
  drop column if exists target_score;

commit;
