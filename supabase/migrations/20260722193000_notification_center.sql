alter table public.notifications
  add column severity text not null default 'info',
  add column category text not null default 'system',
  add column read_at timestamptz,
  add constraint notifications_severity_check
    check (severity in ('info', 'warning', 'critical', 'opportunity')),
  add constraint notifications_category_check
    check (category in ('risk', 'opportunity', 'relationship', 'system'));

create index notifications_user_read_created_idx
  on public.notifications (user_id, read, created_at desc);
create index notifications_severity_created_idx
  on public.notifications (severity, created_at desc);

create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  risk boolean not null default true,
  opportunity boolean not null default true,
  relationship boolean not null default true,
  system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
create policy "users read own notification preferences"
  on public.notification_preferences for select to authenticated
  using (user_id = auth.uid());
create policy "users insert own notification preferences"
  on public.notification_preferences for insert to authenticated
  with check (user_id = auth.uid());
create policy "users update own notification preferences"
  on public.notification_preferences for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
