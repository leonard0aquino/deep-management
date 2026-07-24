-- ============================================================================
-- Corrige a deduplicação de notificações: hoje é feita por texto exato numa
-- janela móvel de 24h, o que falha de duas formas:
--   1. Eventos de 1x (ex.: "recebeu acompanhamento") reaparecem todo dia
--      enquanto a interação estiver dentro da janela de lookback do briefing
--      (48h/14d), porque a janela de dedup de 24h "expira" entre um dia e
--      outro.
--   2. Regras com texto dinâmico (ex.: "há N dias sem contato") nunca
--      deduplicam de verdade, já que o texto muda todo dia.
--
-- A partir de agora, a dedup usa uma chave estável (dedupe_key) definida
-- pela regra de origem: eventos únicos usam o id da interação (nunca mais
-- se repetem); riscos contínuos usam cliente/produto + data (no máximo uma
-- vez por dia).
-- ============================================================================

alter table public.notifications add column dedupe_key text;

create index notifications_dedupe_key_idx on public.notifications (user_id, dedupe_key);
