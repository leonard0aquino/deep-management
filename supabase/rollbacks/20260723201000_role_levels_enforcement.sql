begin;

drop policy if exists "gerente+ or owner delete interactions" on public.interactions;
drop policy if exists "gerente+ or owner update interactions" on public.interactions;
drop policy if exists "authenticated insert interactions" on public.interactions;
create policy "authenticated write interactions" on public.interactions
  for all to authenticated using (true) with check (true);

drop policy if exists "gerente+ write deep_managers" on public.deep_managers;
create policy "authenticated write deep_managers" on public.deep_managers
  for all to authenticated using (true) with check (true);

drop policy if exists "gerente+ write client_contacts" on public.client_contacts;
create policy "authenticated write client_contacts" on public.client_contacts
  for all to authenticated using (true) with check (true);

drop policy if exists "gerente+ write products" on public.products;
create policy "authenticated write products" on public.products
  for all to authenticated using (true) with check (true);

drop policy if exists "gerente+ write clients" on public.clients;
create policy "authenticated write clients" on public.clients
  for all to authenticated using (true) with check (true);

drop function if exists public.is_admin_or_gerente();

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

alter table public.interactions alter column created_by drop default;

alter table public.deep_managers drop column if exists linked_user_id;

update public.user_profiles set role = 'member' where role = 'gerente';

commit;
