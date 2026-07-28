-- Story 2.4 — Mapa de Pessoas e Influência

create type public.stakeholder_relationship_role as enum (
  'patrocinador',
  'decisor',
  'influenciador',
  'usuario_chave',
  'contato_operacional',
  'detrator'
);

drop view if exists public.stakeholder_health;

alter table public.client_contacts
  add column relationship_role public.stakeholder_relationship_role,
  add column owner_manager_id uuid references public.deep_managers (id) on delete set null;

create index client_contacts_role_owner_idx
  on public.client_contacts (relationship_role, owner_manager_id);

create view public.stakeholder_health
with (security_invoker = true)
as
with agg as (
  select
    cc.id as contact_id,
    max(i.occurred_at) as last_contact,
    count(i.id) as interaction_count,
    count(i.id) filter (where i.occurred_at >= current_date - 90) as interactions_90d
  from public.client_contacts cc
  left join public.interactions i on i.contact_id = cc.id
  group by cc.id
), latest_sentiment as (
  select distinct on (i.contact_id)
    i.contact_id,
    i.customer_sentiment as last_customer_sentiment,
    i.occurred_at as sentiment_recorded_at
  from public.interactions i
  where i.contact_id is not null and i.customer_sentiment is not null
  order by i.contact_id, i.occurred_at desc, i.created_at desc
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
  cc.relationship_role,
  cc.owner_manager_id,
  dm.name as owner_manager_name,
  cc.photo_url,
  cc.reports_to_contact_id,
  agg.last_contact,
  agg.interaction_count,
  latest_sentiment.last_customer_sentiment,
  latest_sentiment.sentiment_recorded_at,
  case when agg.last_contact is null then null else (current_date - agg.last_contact) end as days_since_contact,
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
left join public.deep_managers dm on dm.id = cc.owner_manager_id
left join agg on agg.contact_id = cc.id
left join latest_sentiment on latest_sentiment.contact_id = cc.id;

revoke all on table public.client_contacts from anon;
revoke all on table public.client_contacts from authenticated;
grant select, insert, update, delete on table public.client_contacts to authenticated;
grant select, insert, update, delete on table public.client_contacts to service_role;

revoke all on table public.stakeholder_health from anon;
revoke all on table public.stakeholder_health from authenticated;
grant select on table public.stakeholder_health to authenticated;
grant select on table public.stakeholder_health to service_role;
