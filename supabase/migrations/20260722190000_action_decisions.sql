begin;

create table if not exists public.action_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action_key text not null,
  status text not null default 'dismissed' check (status in ('dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint action_decisions_user_action_unique unique (user_id, action_key),
  constraint action_decisions_action_key_not_blank check (length(trim(action_key)) > 0)
);

comment on table public.action_decisions is
  'Persiste decisões do usuário sobre ações derivadas em runtime; ausência de registro significa pendente.';
comment on column public.action_decisions.action_key is
  'Chave determinística e estável da recomendação derivada.';

create index if not exists action_decisions_user_status_idx
  on public.action_decisions (user_id, status, updated_at desc);

alter table public.action_decisions enable row level security;

create policy "users read own action decisions" on public.action_decisions
  for select to authenticated using (user_id = auth.uid());
create policy "users insert own action decisions" on public.action_decisions
  for insert to authenticated with check (user_id = auth.uid());
create policy "users update own action decisions" on public.action_decisions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own action decisions" on public.action_decisions
  for delete to authenticated using (user_id = auth.uid());

create trigger action_decisions_set_updated_at
  before update on public.action_decisions
  for each row execute function public.set_updated_at();

create trigger audit_action_decisions
  after insert or update or delete on public.action_decisions
  for each row execute function public.audit_trigger();

commit;
