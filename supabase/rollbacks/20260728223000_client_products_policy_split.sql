drop policy if exists "managers insert contracted products" on public.client_products;
drop policy if exists "managers update contracted products" on public.client_products;
drop policy if exists "managers delete contracted products" on public.client_products;

create policy "managers manage contracted products"
  on public.client_products for all to authenticated
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
