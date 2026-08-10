-- Rollback operacional: restaura dias corridos sem recriar views dependentes.
-- O valor 'teams' permanece no enum porque valores de enum não são removidos
-- com segurança sem recriar o tipo e todas as colunas dependentes.

begin;

create or replace function public.business_days_between(
  p_start_date date,
  p_end_date date
)
returns integer
language sql
immutable
strict
parallel safe
set search_path = pg_catalog
as $$
  select greatest(p_end_date - p_start_date, 0);
$$;

comment on function public.business_days_between(date, date) is
  'Rollback operacional: diferença em dias corridos entre duas datas.';

commit;
