import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260727181000_client_risk_opportunities.sql"), "utf8");
const rollback = readFileSync(resolve(root, "supabase/rollbacks/20260727181000_client_risk_opportunities.sql"), "utf8");

describe("migration de riscos e oportunidades", () => {
  it("cria tipos e registro operacional relacionado ao cliente e responsável", () => {
    expect(migration).toContain("create type public.client_portfolio_item_kind as enum ('risco', 'oportunidade')");
    expect(migration).toContain("create table public.client_risk_opportunities");
    expect(migration).toContain("client_id uuid not null references public.clients (id) on delete cascade");
    expect(migration).toContain("owner_manager_id uuid not null references public.deep_managers (id) on delete restrict");
    expect(migration).toContain("check (length(trim(title)) between 3 and 300)");
  });

  it("adiciona índices e rastreio de atualização", () => {
    expect(migration).toContain("client_risk_opportunities_client_kind_status_target_idx");
    expect(migration).toContain("client_risk_opportunities_owner_status_target_idx");
    expect(migration).toContain("client_risk_opportunities_created_by_idx");
    expect(migration).toContain("client_risk_opportunities_set_updated_at");
    expect(migration).toContain("client_risk_opportunities_set_updated_by");
  });

  it("protege a tabela com grants mínimos e RLS por papel", () => {
    expect(migration).toContain("alter table public.client_risk_opportunities enable row level security");
    expect(migration).toContain("for select to authenticated using (true)");
    expect(migration).toContain("with check ((select public.is_admin_or_gerente()))");
    expect(migration).toContain("revoke all on table public.client_risk_opportunities from anon");
    expect(migration).toContain("grant select, insert, update, delete on table public.client_risk_opportunities to authenticated");
  });

  it("possui rollback completo e ordenado", () => {
    expect(rollback).toContain("drop table if exists public.client_risk_opportunities");
    expect(rollback).toContain("drop function if exists public.set_client_portfolio_item_updated_by()");
    expect(rollback).toContain("drop type if exists public.client_portfolio_item_status");
    expect(rollback).toContain("drop type if exists public.client_portfolio_item_kind");
  });
});
