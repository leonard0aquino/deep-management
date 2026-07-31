begin;

create or replace function public.validate_user_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  leader_role text;
  expected_leader_role text;
  invalid_direct_report boolean;
begin
  if new.manager_user_id = new.id then
    raise exception 'Um usuário não pode ser seu próprio líder.';
  end if;

  expected_leader_role := case new.role::text
    when 'gerente' then 'executivo'
    when 'supervisor' then 'gerente'
    when 'analista' then 'supervisor'
    else null
  end;

  if expected_leader_role is null and new.manager_user_id is not null then
    raise exception 'Usuários com papel % não possuem líder direto.', new.role::text;
  end if;

  if new.manager_user_id is not null then
    select role::text into leader_role
    from public.user_profiles
    where id = new.manager_user_id;

    if leader_role is distinct from expected_leader_role then
      raise exception 'O líder de % deve possuir o papel %.', new.role::text, expected_leader_role;
    end if;
  end if;

  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    select exists (
      select 1
      from public.user_profiles report
      where report.manager_user_id = new.id
        and report.role::text is distinct from case new.role::text
          when 'executivo' then 'gerente'
          when 'gerente' then 'supervisor'
          when 'supervisor' then 'analista'
          else null
        end
    ) into invalid_direct_report;

    if invalid_direct_report then
      raise exception 'O novo papel invalida subordinados diretos existentes.';
    end if;
  end if;

  return new;
end;
$$;

comment on column public.user_profiles.manager_user_id is
  'Líder direto na cadeia Executivo → Gerente → Supervisor → Analista.';

commit;
