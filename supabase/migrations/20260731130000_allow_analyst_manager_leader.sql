begin;

create or replace function public.validate_user_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  leader_role text;
  allowed_leader_roles text[];
  allowed_report_roles text[];
  invalid_direct_report boolean;
begin
  if new.manager_user_id = new.id then
    raise exception 'Um usuário não pode ser seu próprio líder.';
  end if;

  allowed_leader_roles := case new.role::text
    when 'gerente' then array['executivo']
    when 'supervisor' then array['gerente']
    when 'analista' then array['supervisor', 'gerente']
    else array[]::text[]
  end;

  if cardinality(allowed_leader_roles) = 0 and new.manager_user_id is not null then
    raise exception 'Usuários com papel % não possuem líder direto.', new.role::text;
  end if;

  if new.manager_user_id is not null then
    select role::text into leader_role
    from public.user_profiles
    where id = new.manager_user_id;

    if leader_role is null or not (leader_role = any(allowed_leader_roles)) then
      raise exception 'O líder de % deve possuir um dos papéis: %.', new.role::text, array_to_string(allowed_leader_roles, ', ');
    end if;
  end if;

  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    allowed_report_roles := case new.role::text
      when 'executivo' then array['gerente']
      when 'gerente' then array['supervisor', 'analista']
      when 'supervisor' then array['analista']
      else array[]::text[]
    end;

    select exists (
      select 1
      from public.user_profiles report
      where report.manager_user_id = new.id
        and not (report.role::text = any(allowed_report_roles))
    ) into invalid_direct_report;

    if invalid_direct_report then
      raise exception 'O novo papel invalida subordinados diretos existentes.';
    end if;
  end if;

  return new;
end;
$$;

comment on column public.user_profiles.manager_user_id is
  'Líder direto: Gerente responde a Executivo; Supervisor responde a Gerente; Analista responde a Supervisor ou Gerente.';

commit;
