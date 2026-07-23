-- ============================================================================
-- Fix: interactions_view foi criada com `select i.*` antes da coluna
-- `links` existir. Views não herdam colunas novas automaticamente —
-- precisa recriar.
-- ============================================================================

drop view if exists public.interactions_view;

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
    when (current_date - i.occurred_at) <= 7 then 'recente'
    when (current_date - i.occurred_at) <= 21 then 'ok'
    when (current_date - i.occurred_at) <= 45 then 'atencao'
    when (current_date - i.occurred_at) <= 90 then 'alerta'
    else 'critico'
  end::public.relationship_status as status
from public.interactions i
join public.clients c on c.id = i.client_id
join public.products p on p.id = i.product_id
left join public.deep_managers m on m.id = i.manager_id
left join public.client_contacts cc on cc.id = i.contact_id;

alter view public.interactions_view set (security_invoker = true);
