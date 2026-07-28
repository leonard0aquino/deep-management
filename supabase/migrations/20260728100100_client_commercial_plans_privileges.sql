-- Corrige privilégios implícitos do projeto: TRUNCATE não é protegido por RLS.
revoke all on table public.client_commercial_plans from authenticated;
grant select, insert, update, delete on table public.client_commercial_plans to authenticated;
