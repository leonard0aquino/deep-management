do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime drop table public.notifications;
  end if;
end $$;

drop table if exists public.notification_preferences;
drop index if exists public.notifications_severity_created_idx;
drop index if exists public.notifications_user_read_created_idx;
alter table public.notifications
  drop constraint if exists notifications_category_check,
  drop constraint if exists notifications_severity_check,
  drop column if exists read_at,
  drop column if exists category,
  drop column if exists severity;
