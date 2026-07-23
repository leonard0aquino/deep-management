begin;

alter table public.health_score_settings
  add column if not exists target_score integer not null default 85;

alter table public.health_score_settings
  drop constraint if exists health_score_settings_target_range;

alter table public.health_score_settings
  add constraint health_score_settings_target_range
  check (target_score between 0 and 100);

comment on column public.health_score_settings.target_score is
  'Meta executiva do Health Score, usada como referência visual e de desvio.';

commit;
