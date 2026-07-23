-- ============================================================================
-- Painel de Gestão DEEP — schema inicial
-- Plataforma de acompanhamento de relacionamento com o cliente
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tipos
-- ----------------------------------------------------------------------------

create type public.interaction_type as enum ('call', 'email', 'meeting', 'ticket', 'demo', 'other');
create type public.relationship_status as enum ('recente', 'ok', 'atencao', 'alerta', 'critico');

-- ----------------------------------------------------------------------------
-- Tabelas
-- ----------------------------------------------------------------------------

-- Responsáveis DEEP (gestores internos de conta)
create table public.deep_managers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  avatar_color text default '#2563eb',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Produtos DEEP
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  color text default '#2563eb',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Clientes (empresas acompanhadas)
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  segment text,
  logo_url text,
  contract_value numeric(14, 2),
  contract_renewal_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Contatos do lado do cliente (pessoa que a DEEP fala)
create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create index client_contacts_client_id_idx on public.client_contacts (client_id);

-- Interações (registro principal de acompanhamento)
create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  manager_id uuid references public.deep_managers (id) on delete set null,
  contact_id uuid references public.client_contacts (id) on delete set null,
  interaction_type public.interaction_type not null default 'meeting',
  topic text not null,
  notes text,
  relevance smallint not null check (relevance between 1 and 5),
  occurred_at date not null default current_date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interactions_client_product_idx on public.interactions (client_id, product_id);
create index interactions_occurred_at_idx on public.interactions (occurred_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger interactions_set_updated_at
  before update on public.interactions
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Views — regras de negócio centralizadas (status/score) para não duplicar
-- a lógica de "dias sem contato" no frontend
-- ----------------------------------------------------------------------------

-- Cada interação com seu status individual de recência
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

-- Matriz cliente x produto — só combinações com pelo menos uma interação
-- (o mapa de calor mostra "—" para combinações sem relação nenhuma)
create view public.client_product_matrix as
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
  end::public.relationship_status as status
from public.clients c
cross join public.products p
inner join (
  select
    client_id,
    product_id,
    max(occurred_at) as last_contact,
    count(*) as interaction_count,
    round(avg(relevance)::numeric, 1) as avg_relevance
  from public.interactions
  group by client_id, product_id
) agg on agg.client_id = c.id and agg.product_id = p.id;

-- Score geral (termômetro 0-100), pesos conforme legenda do mapa de calor
create view public.health_score as
select
  round(avg(
    case status
      when 'recente' then 100
      when 'ok' then 80
      when 'atencao' then 55
      when 'alerta' then 30
      when 'critico' then 10
    end
  ))::int as score,
  count(*) filter (where status = 'critico') as critical_count,
  count(*) as tracked_combinations
from public.client_product_matrix;

-- ----------------------------------------------------------------------------
-- Row Level Security — ferramenta interna: qualquer usuário autenticado
-- (time DEEP) tem CRUD completo; anônimos não têm acesso.
-- ----------------------------------------------------------------------------

alter table public.deep_managers enable row level security;
alter table public.products enable row level security;
alter table public.clients enable row level security;
alter table public.client_contacts enable row level security;
alter table public.interactions enable row level security;

create policy "authenticated read deep_managers" on public.deep_managers
  for select to authenticated using (true);
create policy "authenticated write deep_managers" on public.deep_managers
  for all to authenticated using (true) with check (true);

create policy "authenticated read products" on public.products
  for select to authenticated using (true);
create policy "authenticated write products" on public.products
  for all to authenticated using (true) with check (true);

create policy "authenticated read clients" on public.clients
  for select to authenticated using (true);
create policy "authenticated write clients" on public.clients
  for all to authenticated using (true) with check (true);

create policy "authenticated read client_contacts" on public.client_contacts
  for select to authenticated using (true);
create policy "authenticated write client_contacts" on public.client_contacts
  for all to authenticated using (true) with check (true);

create policy "authenticated read interactions" on public.interactions
  for select to authenticated using (true);
create policy "authenticated write interactions" on public.interactions
  for all to authenticated using (true) with check (true);

-- Views herdam RLS das tabelas base via security_invoker (Postgres 15+/Supabase)
alter view public.interactions_view set (security_invoker = true);
alter view public.client_product_matrix set (security_invoker = true);
alter view public.health_score set (security_invoker = true);
