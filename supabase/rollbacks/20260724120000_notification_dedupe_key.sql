begin;
drop index if exists public.notifications_dedupe_key_idx;
alter table public.notifications drop column if exists dedupe_key;
commit;
