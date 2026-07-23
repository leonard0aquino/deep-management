begin;

create table if not exists public.saved_dashboard_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_dashboard_views_name_not_blank check (length(trim(name)) between 1 and 80),
  constraint saved_dashboard_views_filters_object check (jsonb_typeof(filters) = 'object'),
  constraint saved_dashboard_views_filters_allowed_keys check (
    filters - array['period', 'client', 'product', 'manager', 'status', 'view']::text[] = '{}'::jsonb
  ),
  constraint saved_dashboard_views_user_name_unique unique (user_id, name)
);

create unique index if not exists saved_dashboard_views_one_default_idx
  on public.saved_dashboard_views (user_id) where is_default;
create index if not exists saved_dashboard_views_user_updated_idx
  on public.saved_dashboard_views (user_id, updated_at desc);

alter table public.saved_dashboard_views enable row level security;
create policy "users read own saved views" on public.saved_dashboard_views for select to authenticated using (user_id = auth.uid());
create policy "users insert own saved views" on public.saved_dashboard_views for insert to authenticated with check (user_id = auth.uid());
create policy "users update own saved views" on public.saved_dashboard_views for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own saved views" on public.saved_dashboard_views for delete to authenticated using (user_id = auth.uid());

create or replace function public.ensure_single_default_dashboard_view()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.is_default then
    update public.saved_dashboard_views set is_default = false
    where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end;
$$;

create trigger saved_dashboard_views_single_default
  before insert or update of is_default on public.saved_dashboard_views
  for each row execute function public.ensure_single_default_dashboard_view();
create trigger saved_dashboard_views_set_updated_at before update on public.saved_dashboard_views
  for each row execute function public.set_updated_at();
create trigger audit_saved_dashboard_views after insert or update or delete on public.saved_dashboard_views
  for each row execute function public.audit_trigger();

commit;
