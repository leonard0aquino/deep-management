begin;

drop view if exists public.health_score;
drop view if exists public.client_health;
drop view if exists public.client_product_matrix;
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

create view public.client_product_matrix as
with agg as (
  select
    i.client_id,
    i.product_id,
    max(i.occurred_at) as last_contact,
    count(*) as interaction_count,
    round(avg(i.relevance)::numeric, 1) as avg_relevance,
    count(*) filter (where i.occurred_at >= current_date - 90) as interactions_90d,
    count(*) filter (where i.contact_id is not null) as with_contact_count,
    count(distinct i.contact_id) filter (where i.contact_id is not null) as distinct_contacts
  from public.interactions i
  group by i.client_id, i.product_id
),
contacts_per_client as (
  select client_id, count(*) as total_contacts
  from public.client_contacts
  group by client_id
),
weights as (
  select * from public.health_score_settings limit 1
)
select
  c.id as client_id,
  c.name as client_name,
  p.id as product_id,
  p.name as product_name,
  p.color as product_color,
  agg.last_contact,
  agg.interaction_count,
  agg.avg_relevance,
  (current_date - agg.last_contact) as days_since_contact,
  case
    when (current_date - agg.last_contact) <= 7 then 'recente'
    when (current_date - agg.last_contact) <= 21 then 'ok'
    when (current_date - agg.last_contact) <= 45 then 'atencao'
    when (current_date - agg.last_contact) <= 90 then 'alerta'
    else 'critico'
  end::public.relationship_status as status,
  greatest(0, 100 - (current_date - agg.last_contact) * (100.0 / 90))::int as recency_score,
  least(100, (agg.interactions_90d::numeric / 4) * 100)::int as frequency_score,
  round(((agg.avg_relevance - 1) / 4) * 100)::int as relevance_score,
  round((agg.with_contact_count::numeric / nullif(agg.interaction_count, 0)) * 100)::int as participation_score,
  least(100, round((agg.distinct_contacts::numeric / nullif(cpc.total_contacts, 0)) * 100))::int as diversity_score,
  round(
    greatest(0, 100 - (current_date - agg.last_contact) * (100.0 / 90)) * weights.weight_recency
    + least(100, (agg.interactions_90d::numeric / 4) * 100) * weights.weight_frequency
    + (((agg.avg_relevance - 1) / 4) * 100) * weights.weight_relevance
    + coalesce((agg.with_contact_count::numeric / nullif(agg.interaction_count, 0)) * 100, 0) * weights.weight_participation
    + coalesce(least(100, (agg.distinct_contacts::numeric / nullif(cpc.total_contacts, 0)) * 100), 0) * weights.weight_diversity
  )::int as composite_score
from public.clients c
cross join public.products p
cross join weights
inner join agg on agg.client_id = c.id and agg.product_id = p.id
left join contacts_per_client cpc on cpc.client_id = c.id;

alter view public.client_product_matrix set (security_invoker = true);

create view public.client_health as
select
  client_id,
  client_name,
  round(avg(composite_score))::int as score,
  min(days_since_contact) as days_since_last_contact,
  count(*) as tracked_products,
  count(*) filter (where status = 'critico') as critical_products
from public.client_product_matrix
group by client_id, client_name;

alter view public.client_health set (security_invoker = true);

create view public.health_score as
select
  round(avg(composite_score))::int as score,
  count(*) filter (where status = 'critico') as critical_count,
  count(*) as tracked_combinations
from public.client_product_matrix;

alter view public.health_score set (security_invoker = true);

alter table public.health_score_settings drop constraint if exists health_score_settings_thresholds_order;
alter table public.health_score_settings
  drop column if exists threshold_recente_dias,
  drop column if exists threshold_ok_dias,
  drop column if exists threshold_atencao_dias,
  drop column if exists threshold_alerta_dias;

commit;
