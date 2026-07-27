-- Rollback Story 2.2 — remove somente o registro estruturado da carteira.

drop table if exists public.client_risk_opportunities;
drop function if exists public.set_client_portfolio_item_updated_by();
drop type if exists public.client_portfolio_item_status;
drop type if exists public.client_portfolio_item_probability;
drop type if exists public.client_portfolio_item_impact;
drop type if exists public.client_portfolio_item_kind;
