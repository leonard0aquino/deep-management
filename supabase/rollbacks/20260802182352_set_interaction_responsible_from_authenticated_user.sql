drop trigger if exists interactions_set_responsible_from_auth on public.interactions;
drop function if exists public.set_interaction_responsible_from_auth();

drop policy if exists "authenticated insert interactions" on public.interactions;
create policy "authenticated insert interactions" on public.interactions
  for insert to authenticated with check (true);

create or replace view public.interactions_view
with (security_invoker = true)
as
select
  i.id, i.client_id, i.product_id, i.manager_id, i.contact_id,
  i.interaction_type, i.topic, i.notes, i.relevance, i.occurred_at,
  i.created_by, i.created_at, i.updated_at, i.links, i.decisions,
  i.customer_sentiment, i.risks, i.opportunities, i.next_step,
  i.next_step_owner, i.next_step_due_date, i.additional_participants,
  i.confidential, c.name as client_name, p.name as product_name,
  p.color as product_color, m.name as manager_name, cc.name as contact_name,
  current_date - i.occurred_at as days_since_contact,
  case
    when (current_date - i.occurred_at) <= s.threshold_recente_dias then 'recente'::text
    when (current_date - i.occurred_at) <= s.threshold_ok_dias then 'ok'::text
    when (current_date - i.occurred_at) <= s.threshold_atencao_dias then 'atencao'::text
    when (current_date - i.occurred_at) <= s.threshold_alerta_dias then 'alerta'::text
    else 'critico'::text
  end::public.relationship_status as status
from public.interactions i
join public.clients c on c.id = i.client_id
join public.products p on p.id = i.product_id
left join public.deep_managers m on m.id = i.manager_id
left join public.client_contacts cc on cc.id = i.contact_id
cross join (select * from public.health_score_settings limit 1) s;
