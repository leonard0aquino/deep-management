-- ============================================================================
-- Fix: stakeholder_health precisa expor photo_url e reports_to_contact_id
-- (colunas adicionadas depois que a view já existia)
-- ============================================================================

drop view if exists public.stakeholder_health;

create view public.stakeholder_health as
with agg as (
  select
    cc.id as contact_id,
    max(i.occurred_at) as last_contact,
    count(i.id) as interaction_count,
    count(i.id) filter (where i.occurred_at >= current_date - 90) as interactions_90d
  from public.client_contacts cc
  left join public.interactions i on i.contact_id = cc.id
  group by cc.id
)
select
  cc.id as contact_id,
  cc.client_id,
  c.name as client_name,
  cc.name,
  cc.role,
  cc.email,
  cc.phone,
  cc.influence,
  cc.photo_url,
  cc.reports_to_contact_id,
  agg.last_contact,
  agg.interaction_count,
  case when agg.last_contact is null then null else (current_date - agg.last_contact) end
    as days_since_contact,
  case
    when agg.last_contact is null then 'sem_contato'
    when (current_date - agg.last_contact) <= 7 then 'recente'
    when (current_date - agg.last_contact) <= 21 then 'ok'
    when (current_date - agg.last_contact) <= 45 then 'atencao'
    when (current_date - agg.last_contact) <= 90 then 'alerta'
    else 'critico'
  end::text as status,
  case
    when agg.last_contact is null then 0
    else round(
      greatest(0, 100 - (current_date - agg.last_contact) * (100.0 / 90)) * 0.6
      + least(100, (agg.interactions_90d::numeric / 4) * 100) * 0.4
    )::int
  end as score,
  case
    when agg.last_contact is null then 'alto'
    when cc.influence = 'alta' and (current_date - agg.last_contact) > 45 then 'alto'
    when cc.influence = 'media' and (current_date - agg.last_contact) > 90 then 'alto'
    when cc.influence = 'alta' and (current_date - agg.last_contact) > 21 then 'medio'
    when (current_date - agg.last_contact) > 90 then 'medio'
    else 'baixo'
  end as risk
from public.client_contacts cc
join public.clients c on c.id = cc.client_id
left join agg on agg.contact_id = cc.id;

alter view public.stakeholder_health set (security_invoker = true);
