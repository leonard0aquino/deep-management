begin;

alter table public.clients
  add column owner_manager_id uuid references public.deep_managers (id) on delete set null;

comment on column public.clients.owner_manager_id is
  'Responsável principal da AISphere pela governança e acompanhamento do cliente.';

create index clients_owner_manager_id_idx
  on public.clients (owner_manager_id)
  where owner_manager_id is not null;

with ranked_owners as (
  select
    i.client_id,
    i.manager_id,
    row_number() over (
      partition by i.client_id
      order by i.occurred_at desc, i.updated_at desc, i.id desc
    ) as position
  from public.interactions i
  join public.deep_managers m on m.id = i.manager_id and m.active = true
  where i.manager_id is not null
)
update public.clients c
set owner_manager_id = ranked_owners.manager_id
from ranked_owners
where ranked_owners.client_id = c.id
  and ranked_owners.position = 1
  and c.owner_manager_id is null;

commit;
