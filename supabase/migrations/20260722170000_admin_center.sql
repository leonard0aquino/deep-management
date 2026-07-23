-- ============================================================================
-- Master Prompt v2 — Admin Center: multi-usuário com papéis, roadmap,
-- mapa organizacional, fotos, notificações, campos personalizados,
-- taxonomia de temas, templates, API keys e auditoria.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Papéis de usuário (Admin/Member) — base para Admin Center
-- ----------------------------------------------------------------------------

create type public.user_role as enum ('admin', 'member');

create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  role public.user_role not null default 'member',
  created_at timestamptz not null default now()
);

-- Backfill: todo usuário que já existe hoje mantém acesso total (admin),
-- para não regredir o que já funciona.
insert into public.user_profiles (id, name, role)
select id, email, 'admin' from auth.users
on conflict (id) do nothing;

alter table public.user_profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Garante que todo novo usuário criado no Auth ganhe um profile (member por
-- padrão; promovido a admin manualmente no Admin Center).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, name, role)
  values (new.id, new.email, 'member')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create policy "users read own profile or admin reads all" on public.user_profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "admin manages profiles" on public.user_profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. Restringe escrita de configurações sensíveis a admins
-- ----------------------------------------------------------------------------

drop policy if exists "authenticated write health_score_settings" on public.health_score_settings;
create policy "admin writes health_score_settings" on public.health_score_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. Product Health Center: roadmap + receita (protegida/potencial deriva de
--    clients.contract_value já existente, sem inventar números novos)
-- ----------------------------------------------------------------------------

create type public.roadmap_status as enum ('planejado', 'em_andamento', 'concluido');

create table public.product_roadmap_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  title text not null,
  status public.roadmap_status not null default 'planejado',
  target_quarter text,
  created_at timestamptz not null default now()
);

alter table public.product_roadmap_items enable row level security;
create policy "authenticated read roadmap" on public.product_roadmap_items
  for select to authenticated using (true);
create policy "authenticated write roadmap" on public.product_roadmap_items
  for all to authenticated using (true) with check (true);

-- ----------------------------------------------------------------------------
-- 4. People: mapa organizacional (reports_to) + foto
-- ----------------------------------------------------------------------------

alter table public.client_contacts
  add column reports_to_contact_id uuid references public.client_contacts (id) on delete set null,
  add column photo_url text;

-- ----------------------------------------------------------------------------
-- 5. Campos personalizados por cliente (Admin Center > Campos)
-- ----------------------------------------------------------------------------

alter table public.clients
  add column custom_fields jsonb not null default '{}'::jsonb;

-- ----------------------------------------------------------------------------
-- 6. Taxonomia de temas (sugestões, não força FK sobre dado existente)
-- ----------------------------------------------------------------------------

create table public.topic_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.topic_tags enable row level security;
create policy "authenticated read topic_tags" on public.topic_tags
  for select to authenticated using (true);
create policy "authenticated write topic_tags" on public.topic_tags
  for all to authenticated using (true) with check (true);

insert into public.topic_tags (name)
select distinct topic from public.interactions
on conflict (name) do nothing;

-- ----------------------------------------------------------------------------
-- 7. Templates de interação (atalhos para o formulário)
-- ----------------------------------------------------------------------------

create table public.interaction_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  interaction_type public.interaction_type not null,
  topic text not null,
  created_at timestamptz not null default now()
);

alter table public.interaction_templates enable row level security;
create policy "authenticated read templates" on public.interaction_templates
  for select to authenticated using (true);
create policy "authenticated write templates" on public.interaction_templates
  for all to authenticated using (true) with check (true);

insert into public.interaction_templates (name, interaction_type, topic) values
  ('QBR', 'meeting', 'Business Review'),
  ('Onboarding', 'implantacao', 'Kickoff de implantação'),
  ('Check-in rápido', 'call', 'Acompanhamento'),
  ('Follow-up de proposta', 'email', 'Proposta comercial');

-- ----------------------------------------------------------------------------
-- 8. Notificações in-app (alimentadas pelo motor de regras já existente)
-- ----------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  title text not null,
  body text,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "users read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid() or user_id is null);
create policy "users update own notifications" on public.notifications
  for update to authenticated using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);
create policy "authenticated insert notifications" on public.notifications
  for insert to authenticated with check (true);

-- ----------------------------------------------------------------------------
-- 9. API keys (Admin Center > API) — hash armazenado, nunca a chave em claro
-- ----------------------------------------------------------------------------

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  key_hash text not null unique,
  key_prefix text not null,
  created_by uuid references auth.users (id) on delete set null,
  last_used_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.api_keys enable row level security;
create policy "admin manages api_keys" on public.api_keys
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 10. Auditoria — trigger genérico aplicado às tabelas centrais
-- ----------------------------------------------------------------------------

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null,
  actor uuid references auth.users (id) on delete set null,
  diff jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;
create policy "admin reads audit_log" on public.audit_log
  for select to authenticated using (public.is_admin());

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (table_name, record_id, action, actor, diff)
  values (
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    TG_OP,
    auth.uid(),
    case
      when TG_OP = 'DELETE' then to_jsonb(old)
      when TG_OP = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
      else to_jsonb(new)
    end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_clients
  after insert or update or delete on public.clients
  for each row execute function public.audit_trigger();
create trigger audit_interactions
  after insert or update or delete on public.interactions
  for each row execute function public.audit_trigger();
create trigger audit_products
  after insert or update or delete on public.products
  for each row execute function public.audit_trigger();
create trigger audit_deep_managers
  after insert or update or delete on public.deep_managers
  for each row execute function public.audit_trigger();
create trigger audit_client_contacts
  after insert or update or delete on public.client_contacts
  for each row execute function public.audit_trigger();
