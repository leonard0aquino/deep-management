-- Analysts register interactions and need to create the related contact.
-- Updating and deleting contacts remain restricted to managers and admins.
drop policy if exists "gerente+ write client_contacts" on public.client_contacts;

create policy "authenticated insert client_contacts" on public.client_contacts
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.user_profiles where id = (select auth.uid())
    )
  );

create policy "gerente+ update client_contacts" on public.client_contacts
  for update to authenticated
  using ((select public.is_admin_or_gerente()))
  with check ((select public.is_admin_or_gerente()));

create policy "gerente+ delete client_contacts" on public.client_contacts
  for delete to authenticated
  using ((select public.is_admin_or_gerente()));
