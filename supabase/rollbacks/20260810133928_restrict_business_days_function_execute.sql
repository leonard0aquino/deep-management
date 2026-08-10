-- Rollback da restrição explícita aplicada ao papel anon.

begin;

grant execute on function public.business_days_between(date, date) to anon;

commit;
