begin;

drop view if exists public.interactions_view;

alter table public.interactions
  drop column if exists confidential,
  drop column if exists additional_participants,
  drop column if exists next_step_due_date,
  drop column if exists next_step_owner,
  drop column if exists next_step,
  drop column if exists opportunities,
  drop column if exists risks,
  drop column if exists customer_sentiment,
  drop column if exists decisions;

drop type if exists public.customer_sentiment;

create view public.interactions_view as
select
  i.*,
  c.name as client_name,
  p.name as product_name,
  p.color as product_color,
  m.name as manager_name,
  cc.name as contact_name,
  (current_date - i.occurred_at) as days_since_contact,
  case
    when (current_date - i.occurred_at) <= s.threshold_recente_dias then 'recente'
    when (current_date - i.occurred_at) <= s.threshold_ok_dias then 'ok'
    when (current_date - i.occurred_at) <= s.threshold_atencao_dias then 'atencao'
    when (current_date - i.occurred_at) <= s.threshold_alerta_dias then 'alerta'
    else 'critico'
  end::public.relationship_status as status
from public.interactions i
join public.clients c on c.id = i.client_id
join public.products p on p.id = i.product_id
left join public.deep_managers m on m.id = i.manager_id
left join public.client_contacts cc on cc.id = i.contact_id
cross join (select * from public.health_score_settings limit 1) s;

alter view public.interactions_view set (security_invoker = true);
grant select on public.interactions_view to anon, authenticated, service_role;

commit;
