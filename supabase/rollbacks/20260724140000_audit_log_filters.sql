begin;
drop function if exists public.get_audit_log(int, int, text, text, uuid, text);

create or replace function public.get_audit_log(p_limit int default 30)
returns table (
  id uuid,
  table_name text,
  record_id uuid,
  action text,
  actor uuid,
  actor_name text,
  actor_email text,
  diff jsonb,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    a.id,
    a.table_name,
    a.record_id,
    a.action,
    a.actor,
    coalesce(p.name, u.email) as actor_name,
    u.email as actor_email,
    a.diff,
    a.created_at
  from public.audit_log a
  left join public.user_profiles p on p.id = a.actor
  left join auth.users u on u.id = a.actor
  where public.is_admin()
  order by a.created_at desc
  limit p_limit;
$$;

grant execute on function public.get_audit_log(int) to authenticated;
commit;
