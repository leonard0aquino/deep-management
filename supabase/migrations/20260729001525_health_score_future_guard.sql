-- Story 4.5 — torna o Health Score robusto a interações futuras e à virada UTC/BRT.

drop view if exists public.health_score;
drop view if exists public.client_health;
drop view if exists public.client_product_matrix;

create view public.client_product_matrix as
with params as (
  select timezone('America/Sao_Paulo', now())::date as as_of_date
),
agg as (
  select
    i.client_id,
    i.product_id,
    max(i.occurred_at) as last_contact,
    count(*) as interaction_count,
    round(avg(i.relevance)::numeric, 1) as avg_relevance,
    count(*) filter (
      where i.occurred_at between params.as_of_date - 90 and params.as_of_date
    ) as interactions_90d,
    count(*) filter (where i.contact_id is not null) as with_contact_count,
    count(distinct i.contact_id) filter (where i.contact_id is not null) as distinct_contacts
  from public.interactions i
  cross join params
  where i.occurred_at <= params.as_of_date
  group by i.client_id, i.product_id
),
contacts_per_client as (
  select client_id, count(*) as total_contacts
  from public.client_contacts
  group by client_id
),
weights as (
  select * from public.health_score_settings limit 1
),
components as (
  select
    c.id as client_id,
    c.name as client_name,
    p.id as product_id,
    p.name as product_name,
    p.color as product_color,
    agg.last_contact,
    agg.interaction_count,
    agg.avg_relevance,
    params.as_of_date - agg.last_contact as days_since_contact,
    case
      when (params.as_of_date - agg.last_contact) <= weights.threshold_recente_dias then 'recente'
      when (params.as_of_date - agg.last_contact) <= weights.threshold_ok_dias then 'ok'
      when (params.as_of_date - agg.last_contact) <= weights.threshold_atencao_dias then 'atencao'
      when (params.as_of_date - agg.last_contact) <= weights.threshold_alerta_dias then 'alerta'
      else 'critico'
    end::public.relationship_status as status,
    least(100::numeric, greatest(0::numeric,
      100 - (params.as_of_date - agg.last_contact) * (100.0 / 90)
    )) as recency_score,
    least(100::numeric, greatest(0::numeric,
      (agg.interactions_90d::numeric / 4) * 100
    )) as frequency_score,
    least(100::numeric, greatest(0::numeric,
      ((agg.avg_relevance - 1) / 4) * 100
    )) as relevance_score,
    least(100::numeric, greatest(0::numeric,
      coalesce((agg.with_contact_count::numeric / nullif(agg.interaction_count, 0)) * 100, 0)
    )) as participation_score,
    least(100::numeric, greatest(0::numeric,
      coalesce((agg.distinct_contacts::numeric / nullif(cpc.total_contacts, 0)) * 100, 0)
    )) as diversity_score,
    weights.weight_recency,
    weights.weight_frequency,
    weights.weight_relevance,
    weights.weight_participation,
    weights.weight_diversity
  from public.clients c
  cross join public.products p
  cross join weights
  cross join params
  inner join agg on agg.client_id = c.id and agg.product_id = p.id
  left join contacts_per_client cpc on cpc.client_id = c.id
)
select
  client_id,
  client_name,
  product_id,
  product_name,
  product_color,
  last_contact,
  interaction_count,
  avg_relevance,
  days_since_contact,
  status,
  round(recency_score)::int as recency_score,
  round(frequency_score)::int as frequency_score,
  round(relevance_score)::int as relevance_score,
  round(participation_score)::int as participation_score,
  round(diversity_score)::int as diversity_score,
  round(least(100::numeric, greatest(0::numeric,
    recency_score * weight_recency
    + frequency_score * weight_frequency
    + relevance_score * weight_relevance
    + participation_score * weight_participation
    + diversity_score * weight_diversity
  )))::int as composite_score
from components;

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

revoke all on public.client_product_matrix from anon, authenticated;
revoke all on public.client_health from anon, authenticated;
revoke all on public.health_score from anon, authenticated;
grant select on public.client_product_matrix to authenticated, service_role;
grant select on public.client_health to authenticated, service_role;
grant select on public.health_score to authenticated, service_role;

comment on view public.client_product_matrix is
  'Health Score por cliente e produto, calculado apenas com interações ocorridas até a data civil de São Paulo.';
