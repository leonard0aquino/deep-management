import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260811183202_allow_cockpit_upsert_with_historical_stages.sql"),
  "utf8",
).toLowerCase();
const rollback = readFileSync(
  resolve(root, "supabase/rollbacks/20260811183202_allow_cockpit_upsert_with_historical_stages.sql"),
  "utf8",
).toLowerCase();
const dailySyncMigration = readFileSync(
  resolve(root, "supabase/migrations/20260811192000_fix_daily_prospecting_sync_with_historical_stages.sql"),
  "utf8",
).toLowerCase();
const dailySyncRollback = readFileSync(
  resolve(root, "supabase/rollbacks/20260811192000_fix_daily_prospecting_sync_with_historical_stages.sql"),
  "utf8",
).toLowerCase();

describe("migração de upsert do cockpit com etapas históricas", () => {
  it("distingue criação real de upsert sobre painel existente", () => {
    expect(migration).toContain("create or replace function private.prepare_commercial_cockpit_state()");
    expect(migration).toContain("from public.commercial_cockpit_states as state");
    expect(migration).toContain("has_previous_state := found");
    expect(migration).toContain("if not has_previous_state then");
  });

  it("compara valores históricos antes de validar etapas desativadas", () => {
    expect(migration).toContain("new.nda_poc_count is distinct from previous_nda_poc_count");
    expect(migration).toContain("new.last_meeting_on is distinct from previous_last_meeting_on");
    expect(migration).toContain("new.won_count is distinct from previous_won_count");
  });

  it("mantém a função protegida e com search path fixo", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("revoke all on function private.prepare_commercial_cockpit_state()");
    expect(migration).toContain("from public, anon, authenticated");
  });

  it("fornece rollback para a validação anterior", () => {
    expect(rollback).toContain("create or replace function private.prepare_commercial_cockpit_state()");
    expect(rollback).toContain("if tg_op = 'insert' then");
    expect(rollback).not.toContain("has_previous_state");
  });

  it("sincroniza o histórico diário atualizando primeiro um cockpit existente", () => {
    expect(dailySyncMigration).toContain(
      "create or replace function private.sync_commercial_daily_prospecting_total()",
    );
    expect(dailySyncMigration).toContain("update public.commercial_cockpit_states");
    expect(dailySyncMigration).toContain("if not found then");
    expect(dailySyncMigration).not.toContain("on conflict (owner_user_id) do update");
  });

  it("mantém a sincronização protegida e reversível", () => {
    expect(dailySyncMigration).toContain("set search_path = ''");
    expect(dailySyncMigration).toContain(
      "revoke all on function private.sync_commercial_daily_prospecting_total()",
    );
    expect(dailySyncRollback).toContain("on conflict (owner_user_id) do update");
  });
});
