-- Reforça a ACL porque os default privileges do projeto concedem EXECUTE
-- em novas funções públicas também ao papel anon.

begin;

revoke all on function public.business_days_between(date, date) from public, anon;
grant execute on function public.business_days_between(date, date) to authenticated, service_role;

commit;
