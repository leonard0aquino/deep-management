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
});
