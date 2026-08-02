import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260802173301_client_product_multiple_owners.sql"),
  "utf8",
).toLowerCase();
const rollback = readFileSync(
  resolve(root, "supabase/rollbacks/20260802173301_client_product_multiple_owners.sql"),
  "utf8",
).toLowerCase();

describe("migração de múltiplos responsáveis por produto e cliente", () => {
  it("cria relação muitos-para-muitos sem duplicar responsáveis", () => {
    expect(migration).toContain("create table public.client_product_owners");
    expect(migration).toContain("unique (client_product_id, manager_id)");
    expect(migration).toContain("references public.client_products (id) on delete cascade");
    expect(migration).toContain("references public.deep_managers (id) on delete restrict");
  });

  it("preserva os responsáveis existentes e a compatibilidade transitória", () => {
    expect(migration).toContain("select cp.id, cp.owner_manager_id");
    expect(migration).toContain("sync_legacy_client_product_owner_after_write");
    expect(migration).not.toContain("drop column");
  });

  it("habilita RLS, índices de acesso e permissões explícitas", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("client_product_owners_manager_active_idx");
    expect(migration).toContain("grant select, insert, update, delete on public.client_product_owners to authenticated");
  });

  it("possui rollback não destrutivo para o modelo legado", () => {
    expect(rollback).toContain("drop table if exists public.client_product_owners");
    expect(rollback).toContain("responsável aisphere pela combinação específica");
    expect(rollback).not.toContain("drop column");
  });
});
