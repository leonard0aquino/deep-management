-- ============================================================================
-- Health Score v2 — score composto ponderado + tipos de evento ampliados
-- Pesos: 35% recência, 25% frequência, 20% relevância,
--        10% participação do cliente, 10% diversidade de contatos
-- ============================================================================

-- Views dependentes de public.interactions precisam ser derrubadas antes de
-- alterar o tipo da coluna interaction_type (Postgres bloqueia alter type
-- de coluna referenciada por view, mesmo via `select *`).
drop view if exists public.health_score;
drop view if exists public.client_health;
drop view if exists public.client_product_matrix;
drop view if exists public.interactions_view;

-- ----------------------------------------------------------------------------
-- Tipos de interação ampliados (Timeline: reuniões, emails, whatsapp,
-- telefonemas, implantações, treinamentos, incidentes, encerramentos)
-- ----------------------------------------------------------------------------

alter type public.interaction_type rename to interaction_type_old;

create type public.interaction_type as enum (
  'meeting', 'call', 'email', 'whatsapp', 'ticket', 'demo',
  'implantacao', 'treinamento', 'incidente', 'encerramento', 'other'
);

alter table public.interactions
  alter column interaction_type drop default,
  alter column interaction_type type public.interaction_type
    using (interaction_type::text)::public.interaction_type,
  alter column interaction_type set default 'meeting';

drop type public.interaction_type_old;

-- ----------------------------------------------------------------------------
-- Recriação: cada interação com seu status individual de recência
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Matriz cliente x produto — agora com score composto por combinação
-- ----------------------------------------------------------------------------

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
  -- componentes do score (0-100 cada)
  greatest(0, 100 - (current_date - agg.last_contact) * (100.0 / 90))::int as recency_score,
  least(100, (agg.interactions_90d::numeric / 4) * 100)::int as frequency_score,
  round(((agg.avg_relevance - 1) / 4) * 100)::int as relevance_score,
  round((agg.with_contact_count::numeric / nullif(agg.interaction_count, 0)) * 100)::int as participation_score,
  least(100, round((agg.distinct_contacts::numeric / nullif(cpc.total_contacts, 0)) * 100))::int as diversity_score,
  -- score composto ponderado
  round(
    greatest(0, 100 - (current_date - agg.last_contact) * (100.0 / 90)) * 0.35
    + least(100, (agg.interactions_90d::numeric / 4) * 100) * 0.25
    + (((agg.avg_relevance - 1) / 4) * 100) * 0.20
    + coalesce((agg.with_contact_count::numeric / nullif(agg.interaction_count, 0)) * 100, 0) * 0.10
    + coalesce(least(100, (agg.distinct_contacts::numeric / nullif(cpc.total_contacts, 0)) * 100), 0) * 0.10
  )::int as composite_score
from public.clients c
cross join public.products p
inner join agg on agg.client_id = c.id and agg.product_id = p.id
left join contacts_per_client cpc on cpc.client_id = c.id;

alter view public.client_product_matrix set (security_invoker = true);

-- ----------------------------------------------------------------------------
-- Score por cliente (agregado das combinações produto x cliente)
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Score geral da carteira (substitui o antigo health_score)
-- ----------------------------------------------------------------------------

create view public.health_score as
select
  round(avg(composite_score))::int as score,
  count(*) filter (where status = 'critico') as critical_count,
  count(*) as tracked_combinations
from public.client_product_matrix;

alter view public.health_score set (security_invoker = true);
