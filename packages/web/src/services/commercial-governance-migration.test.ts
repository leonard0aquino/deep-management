import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260804082134_commercial_governance_foundation.sql"),
  "utf8",
).toLowerCase();
const rollback = readFileSync(
  resolve(root, "supabase/rollbacks/20260804082134_commercial_governance_foundation.sql"),
  "utf8",
).toLowerCase();

describe("migração da governança Comercial", () => {
  it("separa área, tipo de empresa e elegibilidade para o Health Score", () => {
    expect(migration).toContain("create type public.business_area as enum ('customer_success', 'commercial')");
    expect(migration).toContain("create type public.client_kind as enum ('prospect', 'customer')");
    expect(migration).toContain("add column if not exists business_area");
    expect(migration).toContain("add column if not exists client_kind");
    expect(migration).toContain("add column if not exists counts_for_health");
  });

  it("deriva e protege a origem da interação no banco", () => {
    expect(migration).toContain("author_id := coalesce((select auth.uid()), new.created_by)");
    expect(migration).toContain("new.business_area := old.business_area");
    expect(migration).toContain("new.counts_for_health := old.counts_for_health");
    expect(migration).toContain("before insert or update of business_area, counts_for_health");
  });

  it("exclui Comercial e prospectes dos indicadores de Customer Success", () => {
    expect(migration).toContain("i.business_area = 'customer_success'");
    expect(migration).toContain("and i.counts_for_health");
    expect(migration).toContain("where c.client_kind = 'customer'");
    expect(migration).toContain("join public.clients c on c.id = cc.client_id and c.client_kind = 'customer'");
  });

  it("mantém views invoker, grants explícitos e índices dos filtros", () => {
    expect(migration.match(/with \(security_invoker = true\)/g)?.length).toBeGreaterThanOrEqual(5);
    expect(migration).toContain("grant select on public.client_product_matrix");
    expect(migration).toContain("interactions_business_area_occurred_at_idx");
    expect(migration).toContain("where counts_for_health");
  });

  it("oferece rollback operacional sem apagar tabelas ou históricos", () => {
    expect(rollback).toContain("drop trigger if exists interactions_protect_business_area");
    expect(rollback).toContain("set business_area = 'customer_success'");
    expect(rollback).toContain("counts_for_health = true");
    expect(rollback).not.toContain("drop table");
  });
});
