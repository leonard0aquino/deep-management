drop policy if exists "authenticated insert client_contacts" on public.client_contacts;
drop policy if exists "gerente+ update client_contacts" on public.client_contacts;
drop policy if exists "gerente+ delete client_contacts" on public.client_contacts;

create policy "gerente+ write client_contacts" on public.client_contacts
  for all to authenticated
  using (public.is_admin_or_gerente())
  with check (public.is_admin_or_gerente());
