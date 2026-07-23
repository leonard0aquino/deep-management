-- ============================================================================
-- Fase 4 — Pesos do Health Score editáveis (antes fixos na fórmula SQL)
-- ============================================================================

-- Tabela singleton (id sempre true) — uma única linha de configuração
create table public.health_score_settings (
  id boolean primary key default true,
  weight_recency numeric(4, 2) not null default 0.35,
  weight_frequency numeric(4, 2) not null default 0.25,
  weight_relevance numeric(4, 2) not null default 0.20,
  weight_participation numeric(4, 2) not null default 0.10,
  weight_diversity numeric(4, 2) not null default 0.10,
  updated_at timestamptz not null default now(),
  constraint health_score_settings_singleton check (id),
  constraint health_score_settings_weights_sum check (
    abs(
      weight_recency + weight_frequency + weight_relevance
      + weight_participation + weight_diversity - 1
    ) < 0.01
  )
);

insert into public.health_score_settings (id) values (true);

alter table public.health_score_settings enable row level security;

create policy "authenticated read health_score_settings" on public.health_score_settings
  for select to authenticated using (true);
create policy "authenticated write health_score_settings" on public.health_score_settings
  for update to authenticated using (true) with check (true);

create trigger health_score_settings_set_updated_at
  before update on public.health_score_settings
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Recria client_product_matrix (e as views que dependem dela) usando os
-- pesos da tabela de configuração em vez de constantes fixas.
-- ----------------------------------------------------------------------------

drop view if exists public.health_score;
drop view if exists public.client_health;
drop view if exists public.client_product_matrix;

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
