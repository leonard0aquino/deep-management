begin;

drop index if exists public.clients_owner_manager_id_idx;

alter table public.clients
  drop column if exists owner_manager_id;

commit;
