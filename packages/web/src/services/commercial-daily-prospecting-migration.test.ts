import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260809193839_commercial_daily_prospecting.sql"),
  "utf8",
).toLowerCase();
const rollback = readFileSync(
  resolve(root, "supabase/rollbacks/20260809193839_commercial_daily_prospecting.sql"),
  "utf8",
).toLowerCase();

describe("migration de prospecções diárias", () => {
  it("cria histórico único, validado e auditável", () => {
    expect(migration).toContain("create table public.commercial_daily_prospecting");
    expect(migration).toContain("unique (owner_user_id, activity_on)");
    expect(migration).toContain("check (prospecting_count >= 0)");
    expect(migration).toContain("new.activity_on > current_day");
    expect(migration).toContain("profile.role::text = 'analista'");
    expect(migration).toContain("private.commercial_user_has_stage(profile.id, 'prospecting')");
    expect(migration).toContain("create trigger audit_commercial_daily_prospecting");
  });

  it("sincroniza o acumulado pela diferença na mesma transação", () => {
    expect(migration).toContain("count_delta := new.prospecting_count");
    expect(migration).toContain("commercial_cockpit_states.prospecting_count + count_delta");
    expect(migration).toContain("after insert or update or delete on public.commercial_daily_prospecting");
    expect(migration).toContain("prospecting_count - old.prospecting_count");
    expect(migration).toContain("create or replace function public.save_commercial_cockpit");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("grant execute on function public.save_commercial_cockpit");
    expect(migration).toContain("when p_daily_activity_on is null then excluded.prospecting_count");
    expect(migration).toContain("else commercial_cockpit_states.prospecting_count");
    expect(migration).toMatch(/^--[\s\S]*begin;[\s\S]*commit;\s*$/);
  });

  it("aplica leitura hierárquica, escrita self-owner e grants explícitos", () => {
    expect(migration).toContain("private.can_access_commercial_user(owner_user_id)");
    expect(migration.match(/owner_user_id = \(select auth\.uid\(\)\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration).toContain("grant select, insert, update on public.commercial_daily_prospecting to authenticated");
    expect(migration).not.toContain("grant delete");
  });

  it("oferece rollback completo", () => {
    expect(rollback).toContain("lock table public.commercial_daily_prospecting in access exclusive mode");
    expect(rollback).toContain("sum(prospecting_count)::integer");
    expect(rollback).toContain("cockpit.prospecting_count - daily_totals.prospecting_count");
    expect(rollback).toContain("drop function if exists public.save_commercial_cockpit");
    expect(rollback).toContain("drop table if exists public.commercial_daily_prospecting");
    expect(rollback).toContain("drop function if exists private.sync_commercial_daily_prospecting_total()");
    expect(rollback).toContain("drop function if exists private.prepare_commercial_daily_prospecting()");
  });
});
