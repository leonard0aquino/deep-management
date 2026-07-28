revoke all on function public.import_structured_data(text, text, jsonb) from authenticated;
drop function if exists public.import_structured_data(text, text, jsonb);
drop table if exists public.import_batches;
drop table if exists public.client_products;
