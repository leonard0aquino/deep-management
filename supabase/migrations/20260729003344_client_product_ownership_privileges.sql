-- Reconcilia privilégios do vínculo cliente × produto em ambientes já migrados.

revoke all on public.client_products from anon, authenticated;
grant select, insert, update, delete on public.client_products to authenticated;
grant all on public.client_products to service_role;
