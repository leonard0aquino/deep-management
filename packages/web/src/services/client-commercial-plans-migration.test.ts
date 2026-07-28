import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260728100000_client_commercial_plans.sql"), "utf8");
const rollback = readFileSync(resolve(root, "supabase/rollbacks/20260728100000_client_commercial_plans.sql"), "utf8");

describe("client commercial plans migration", () => {
  it("define integridade, unicidade e índices", () => {
    expect(migration).toContain("create table public.client_commercial_plans");
    expect(migration).toContain("client_id uuid not null unique references public.clients");
    expect(migration).toContain("probability between 0 and 100");
    expect(migration).toContain("expected_renewal_value >= 0");
    expect(migration).toContain("expansion_value >= 0");
    expect(migration).toContain("client_commercial_plans_owner_status_due_idx");
  });

  it("habilita RLS e grants explícitos", () => {
    expect(migration).toContain("alter table public.client_commercial_plans enable row level security");
    expect(migration).toContain("authenticated read client commercial plans");
    expect(migration).toContain("gerente+ insert client commercial plans");
    expect(migration).toContain("gerente+ update client commercial plans");
    expect(migration).toContain("revoke all on table public.client_commercial_plans from anon");
    expect(migration).toContain("revoke all on table public.client_commercial_plans from authenticated");
    expect(migration).toContain("grant select, insert, update, delete on table public.client_commercial_plans to authenticated");
  });

  it("possui rollback completo", () => {
    expect(rollback).toContain("drop table if exists public.client_commercial_plans");
    expect(rollback).toContain("drop function if exists public.set_client_commercial_plan_updated_by");
    expect(rollback).toContain("drop type if exists public.client_commercial_plan_status");
  });
});
