-- Rollback operacional da Story 6.1.
--
-- Este rollback deve ser usado antes da adoção Comercial. Ele preserva as
-- colunas aditivas para não quebrar uma aplicação já publicada, mas restaura
-- todos os registros ao comportamento legado de Customer Success.

drop trigger if exists interactions_protect_business_area on public.interactions;
drop function if exists public.protect_interaction_business_area();

update public.user_profiles
set business_area = 'customer_success'
where business_area <> 'customer_success';

update public.clients
set client_kind = 'customer'
where client_kind <> 'customer';

update public.interactions
set business_area = 'customer_success',
    counts_for_health = true
where business_area <> 'customer_success' or not counts_for_health;

comment on column public.user_profiles.business_area is
  'Coluna preservada por compatibilidade após rollback operacional; todos os usuários retornam a Customer Success.';
comment on column public.clients.client_kind is
  'Coluna preservada por compatibilidade após rollback operacional; todas as empresas retornam a customer.';
comment on column public.interactions.business_area is
  'Coluna preservada por compatibilidade após rollback operacional; novas linhas usam o default customer_success.';
