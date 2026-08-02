begin;

drop trigger if exists sync_legacy_client_product_owner_after_write on public.client_products;
drop function if exists public.sync_legacy_client_product_owner();
drop table if exists public.client_product_owners;

comment on column public.client_products.owner_manager_id is
  'Responsável AISphere pela combinação específica de cliente e produto.';

commit;
