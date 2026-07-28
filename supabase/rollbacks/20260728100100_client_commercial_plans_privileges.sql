-- Restaura os privilégios implícitos observados antes desta correção.
grant references, trigger, truncate on table public.client_commercial_plans to authenticated;
