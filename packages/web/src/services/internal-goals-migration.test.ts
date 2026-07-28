import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260728230000_internal_goals.sql"), "utf8");
const rollback = readFileSync(resolve(root, "supabase/rollbacks/20260728230000_internal_goals.sql"), "utf8");

describe("migration de metas internas", () => {
  it("cria somente as seis metas e valida seus intervalos", () => {
    expect(migration).toContain("create table public.internal_goals");
    expect(migration.match(/\('(?:portfolio_on_track|actions_on_time|strategic_stakeholder_coverage|risk_client_reduction|alert_response_time|updated_success_plans)'/g)).toHaveLength(6);
    expect(migration).toContain("internal_goals_target_range");
    expect(migration).toContain("target_value between 1 and 720");
    expect(migration).toContain("target_value between 0 and 100");
    expect(migration).toContain("baseline_value is null or baseline_value > 0");
  });

  it("protege leitura e atualização com RLS e grants explícitos", () => {
    expect(migration).toContain("alter table public.internal_goals enable row level security");
    expect(migration).toContain("authenticated read internal goals");
    expect(migration).toContain("gerente+ update internal goals");
    expect(migration).toContain("using ((select public.is_admin_or_gerente()))");
    expect(migration).toContain("with check ((select public.is_admin_or_gerente()))");
    expect(migration).toContain("revoke all on table public.internal_goals from anon");
    expect(migration).toContain("grant select, update on table public.internal_goals to authenticated");
  });

  it("mantém autoria, atualização e rollback completo", () => {
    expect(migration).toContain("internal_goals_set_updated_at");
    expect(migration).toContain("internal_goals_set_updated_by");
    expect(rollback).toContain("drop table if exists public.internal_goals");
    expect(rollback).toContain("drop function if exists public.set_internal_goal_updated_by");
  });
});
