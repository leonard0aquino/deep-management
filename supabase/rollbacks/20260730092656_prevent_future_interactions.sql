alter table public.interactions
  drop constraint if exists interactions_occurred_at_not_future;
