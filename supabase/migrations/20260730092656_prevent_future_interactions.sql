alter table public.interactions
  add constraint interactions_occurred_at_not_future
  check (occurred_at <= timezone('America/Sao_Paulo', created_at)::date);
