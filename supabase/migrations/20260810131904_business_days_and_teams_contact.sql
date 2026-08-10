-- Refinamentos das stories 4.9 e 1.15:
-- contabiliza a recência em dias úteis e adiciona o canal Contato no Teams.

begin;

alter type public.interaction_type add value if not exists 'teams' after 'whatsapp';

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
  select case
    when p_end_date <= p_start_date then 0
    else ((p_end_date - p_start_date) / 7) * 5
      + (
        select count(*)::integer
        from pg_catalog.generate_series(
          1,
          (p_end_date - p_start_date) % 7
        ) as remaining(day_offset)
        where extract(isodow from p_start_date + remaining.day_offset) < 6
      )
  end;
$$;

revoke all on function public.business_days_between(date, date) from public;
grant execute on function public.business_days_between(date, date) to authenticated, service_role;

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
  p.color as product_color, coalesce(m.name, creator.name) as manager_name,
  cc.name as contact_name, age.days_since_contact,
  case
    when age.days_since_contact <= s.threshold_recente_dias then 'recente'::text
    when age.days_since_contact <= s.threshold_ok_dias then 'ok'::text
    when age.days_since_contact <= s.threshold_atencao_dias then 'atencao'::text
    when age.days_since_contact <= s.threshold_alerta_dias then 'alerta'::text
    else 'critico'::text
  end::public.relationship_status as status,
  i.business_area,
  i.counts_for_health
from public.interactions i
join public.clients c on c.id = i.client_id
join public.products p on p.id = i.product_id
left join public.deep_managers m on m.id = i.manager_id
left join public.user_profiles creator on creator.id = i.created_by
left join public.client_contacts cc on cc.id = i.contact_id
cross join (select * from public.health_score_settings limit 1) s
cross join lateral (
  values (public.business_days_between(
    i.occurred_at,
    timezone('America/Sao_Paulo', now())::date
  ))
) as age(days_since_contact);

drop view if exists public.health_score;
drop view if exists public.client_health;
drop view if exists public.client_product_matrix;

create view public.client_product_matrix
with (security_invoker = true)
as
with params as (
  select timezone('America/Sao_Paulo', now())::date as as_of_date
), agg as (
  select
    i.client_id,
    i.product_id,
    max(i.occurred_at) as last_contact,
    count(*) as interaction_count,
    round(avg(i.relevance)::numeric, 1) as avg_relevance,
    count(*) filter (where i.occurred_at between params.as_of_date - 90 and params.as_of_date) as interactions_90d,
    count(*) filter (where i.contact_id is not null) as with_contact_count,
    count(distinct i.contact_id) filter (where i.contact_id is not null) as distinct_contacts
  from public.interactions i
  cross join params
  where i.occurred_at <= params.as_of_date
    and i.business_area = 'customer_success'
    and i.counts_for_health
  group by i.client_id, i.product_id
), contacts_per_client as (
  select client_id, count(*) as total_contacts
  from public.client_contacts
  group by client_id
), weights as (
  select * from public.health_score_settings limit 1
), components as (
  select
    c.id as client_id,
    c.name as client_name,
    p.id as product_id,
    p.name as product_name,
    p.color as product_color,
    agg.last_contact,
    agg.interaction_count,
    agg.avg_relevance,
    age.days_since_contact,
    case
      when age.days_since_contact <= weights.threshold_recente_dias then 'recente'
      when age.days_since_contact <= weights.threshold_ok_dias then 'ok'
      when age.days_since_contact <= weights.threshold_atencao_dias then 'atencao'
      when age.days_since_contact <= weights.threshold_alerta_dias then 'alerta'
      else 'critico'
    end::public.relationship_status as status,
    least(100::numeric, greatest(0::numeric, 100 - age.days_since_contact * (100.0 / 90))) as recency_score,
    least(100::numeric, greatest(0::numeric, (agg.interactions_90d::numeric / 4) * 100)) as frequency_score,
    least(100::numeric, greatest(0::numeric, ((agg.avg_relevance - 1) / 4) * 100)) as relevance_score,
    least(100::numeric, greatest(0::numeric, coalesce((agg.with_contact_count::numeric / nullif(agg.interaction_count, 0)) * 100, 0))) as participation_score,
    least(100::numeric, greatest(0::numeric, coalesce((agg.distinct_contacts::numeric / nullif(cpc.total_contacts, 0)) * 100, 0))) as diversity_score,
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
  cross join lateral (
    values (public.business_days_between(agg.last_contact, params.as_of_date))
  ) as age(days_since_contact)
  where c.client_kind = 'customer'
)
select
  client_id, client_name, product_id, product_name, product_color,
  last_contact, interaction_count, avg_relevance, days_since_contact, status,
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

create view public.client_health
with (security_invoker = true)
as
select
  client_id, client_name, round(avg(composite_score))::int as score,
  min(days_since_contact) as days_since_last_contact,
  count(*) as tracked_products,
  count(*) filter (where status = 'critico') as critical_products
from public.client_product_matrix
group by client_id, client_name;

create view public.health_score
with (security_invoker = true)
as
select
  round(avg(composite_score))::int as score,
  count(*) filter (where status = 'critico') as critical_count,
  count(*) as tracked_combinations
from public.client_product_matrix;

create or replace view public.stakeholder_health
with (security_invoker = true)
as
with params as (
  select timezone('America/Sao_Paulo', now())::date as as_of_date
), agg as (
  select
    cc.id as contact_id,
    max(i.occurred_at) as last_contact,
    count(i.id) as interaction_count,
    count(i.id) filter (where i.occurred_at >= params.as_of_date - 90) as interactions_90d
  from public.client_contacts cc
  cross join params
  left join public.interactions i on i.contact_id = cc.id
    and i.business_area = 'customer_success'
    and i.counts_for_health
  group by cc.id
), latest_sentiment as (
  select distinct on (i.contact_id)
    i.contact_id,
    i.customer_sentiment as last_customer_sentiment,
    i.occurred_at as sentiment_recorded_at
  from public.interactions i
  where i.contact_id is not null
    and i.customer_sentiment is not null
    and i.business_area = 'customer_success'
    and i.counts_for_health
  order by i.contact_id, i.occurred_at desc, i.created_at desc
)
select
  cc.id as contact_id, cc.client_id, c.name as client_name, cc.name, cc.role,
  cc.email, cc.phone, cc.influence, cc.relationship_role, cc.owner_manager_id,
  dm.name as owner_manager_name, cc.photo_url, cc.reports_to_contact_id,
  agg.last_contact, agg.interaction_count, latest_sentiment.last_customer_sentiment,
  latest_sentiment.sentiment_recorded_at, age.days_since_contact,
  case
    when agg.last_contact is null then 'sem_contato'
    when age.days_since_contact <= 7 then 'recente'
    when age.days_since_contact <= 21 then 'ok'
    when age.days_since_contact <= 45 then 'atencao'
    when age.days_since_contact <= 90 then 'alerta'
    else 'critico'
  end::text as status,
  case when agg.last_contact is null then 0 else round(
    greatest(0, 100 - age.days_since_contact * (100.0 / 90)) * 0.6
    + least(100, (agg.interactions_90d::numeric / 4) * 100) * 0.4
  )::int end as score,
  case
    when agg.last_contact is null then 'alto'
    when cc.influence = 'alta' and age.days_since_contact > 45 then 'alto'
    when cc.influence = 'media' and age.days_since_contact > 90 then 'alto'
    when cc.influence = 'alta' and age.days_since_contact > 21 then 'medio'
    when age.days_since_contact > 90 then 'medio'
    else 'baixo'
  end as risk
from public.client_contacts cc
join public.clients c on c.id = cc.client_id and c.client_kind = 'customer'
left join public.deep_managers dm on dm.id = cc.owner_manager_id
left join agg on agg.contact_id = cc.id
left join latest_sentiment on latest_sentiment.contact_id = cc.id
cross join params
left join lateral (
  values (public.business_days_between(agg.last_contact, params.as_of_date))
) as age(days_since_contact) on true;

revoke all on public.client_product_matrix, public.client_health, public.health_score, public.stakeholder_health from anon, authenticated;
grant select on public.client_product_matrix, public.client_health, public.health_score, public.stakeholder_health to authenticated, service_role;

comment on function public.business_days_between(date, date) is
  'Conta segunda a sexta após a data inicial até a data final, sem considerar feriados.';

commit;
