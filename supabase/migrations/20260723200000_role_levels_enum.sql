-- ============================================================================
-- Níveis de acesso — adiciona Gerente e Analista ao enum user_role.
-- (Migration isolada: valores de enum novos não podem ser usados na mesma
-- transação em que são criados.)
-- ============================================================================

alter type public.user_role add value if not exists 'gerente';
alter type public.user_role add value if not exists 'analista';
