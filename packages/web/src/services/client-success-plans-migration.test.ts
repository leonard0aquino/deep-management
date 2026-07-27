import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260727174500_client_success_plans.sql"),
  "utf8",
);
const rollback = readFileSync(
  resolve(root, "supabase/rollbacks/20260727174500_client_success_plans.sql"),
  "utf8",
);

describe("migration do Plano de Sucesso", () => {
  it("cria plano único por cliente e marcos relacionados", () => {
    expect(migration).toContain("create table public.client_success_plans");
    expect(migration).toContain("client_id uuid not null unique references public.clients (id) on delete cascade");
    expect(migration).toContain("create table public.client_success_milestones");
    expect(migration).toContain("plan_id uuid not null references public.client_success_plans (id) on delete cascade");
    expect(migration).toContain("owner_manager_id uuid not null references public.deep_managers (id) on delete restrict");
  });

  it("cria constraints, índices e rastreio de atualização", () => {
    expect(migration).toContain("check (length(trim(objective)) between 3 and 500)");
    expect(migration).toContain("client_success_plans_owner_target_idx");
    expect(migration).toContain("client_success_milestones_plan_target_idx");
    expect(migration).toContain("client_success_milestones_owner_status_target_idx");
    expect(migration).toContain("client_success_plans_created_by_idx");
    expect(migration).toContain("client_success_milestones_updated_by_idx");
    expect(migration).toContain("client_success_plans_set_updated_at");
    expect(migration).toContain("client_success_milestones_set_updated_by");
  });

  it("protege as tabelas expostas com grants mínimos e RLS por papel", () => {
    expect(migration).toContain("alter table public.client_success_plans enable row level security");
    expect(migration).toContain("alter table public.client_success_milestones enable row level security");
    expect(migration).toContain("for select to authenticated using (true)");
    expect(migration).toContain("with check ((select public.is_admin_or_gerente()))");
    expect(migration).toContain("revoke all on table public.client_success_plans from anon");
    expect(migration).toContain("grant select, insert, update, delete on table public.client_success_plans to authenticated");
  });

  it("possui rollback completo e ordenado", () => {
    expect(rollback).toContain("drop table if exists public.client_success_milestones");
    expect(rollback).toContain("drop table if exists public.client_success_plans");
    expect(rollback).toContain("drop function if exists public.set_success_record_updated_by()");
    expect(rollback).toContain("drop type if exists public.success_milestone_status");
    expect(rollback).toContain("drop type if exists public.success_plan_status");
  });
});
