-- Avoid overlapping permissive SELECT policies while preserving manager writes.

drop policy if exists "managers manage contracted products" on public.client_products;

create policy "managers insert contracted products"
  on public.client_products for insert to authenticated
  with check (
    exists (
      select 1 from public.user_profiles p
      where p.id = (select auth.uid()) and p.role in ('admin', 'gerente')
    )
  );

create policy "managers update contracted products"
  on public.client_products for update to authenticated
  using (
    exists (
      select 1 from public.user_profiles p
      where p.id = (select auth.uid()) and p.role in ('admin', 'gerente')
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles p
      where p.id = (select auth.uid()) and p.role in ('admin', 'gerente')
    )
  );

create policy "managers delete contracted products"
  on public.client_products for delete to authenticated
  using (
    exists (
      select 1 from public.user_profiles p
      where p.id = (select auth.uid()) and p.role in ('admin', 'gerente')
    )
  );
