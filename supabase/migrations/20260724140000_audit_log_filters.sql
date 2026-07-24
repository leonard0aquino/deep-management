-- ============================================================================
-- Auditoria: adiciona paginação (limit/offset) e filtros (ação, tabela,
-- autor, busca livre) ao get_audit_log(), para suportar tabela com
-- busca/filtro na UI sem depender só dos últimos 30 registros carregados.
-- ============================================================================

drop function if exists public.get_audit_log(int);

create or replace function public.get_audit_log(
  p_limit int default 30,
  p_offset int default 0,
  p_action text default null,
  p_table_name text default null,
  p_actor uuid default null,
  p_search text default null
)
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
    and (p_action is null or a.action = p_action)
    and (p_table_name is null or a.table_name = p_table_name)
    and (p_actor is null or a.actor = p_actor)
    and (
      p_search is null or p_search = '' or
      a.table_name ilike '%' || p_search || '%' or
      coalesce(p.name, '') ilike '%' || p_search || '%' or
      coalesce(u.email, '') ilike '%' || p_search || '%' or
      a.diff::text ilike '%' || p_search || '%'
    )
  order by a.created_at desc
  limit p_limit offset p_offset;
$$;

grant execute on function public.get_audit_log(int, int, text, text, uuid, text) to authenticated;
