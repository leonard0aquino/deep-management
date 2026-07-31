import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "..", "..");
const migration = readFileSync(join(root, "supabase/migrations/20260730212511_access_levels.sql"), "utf8").toLowerCase();
const rollback = readFileSync(join(root, "supabase/rollbacks/20260730212511_access_levels.sql"), "utf8").toLowerCase();

describe("migração de níveis de acesso", () => {
  it("restringe os papéis e remove a gestão de perfis por gerente", () => {
    expect(migration).toContain("alter type public.user_role add value if not exists 'executivo'");
    expect(migration).toContain("user_profiles_role_check");
    expect(migration).toContain("'admin', 'executivo', 'gerente', 'analista'");
    expect(migration).toContain("deep_managers_linked_user_unique_idx");
    expect(migration).toContain('drop policy if exists "gerente manages non-admin profiles"');
  });

  it("oferece rollback reversível", () => {
    expect(rollback).toContain("drop constraint if exists user_profiles_role_check");
    expect(rollback).toContain("user_profiles_role_legacy_check");
    expect(rollback).toContain("where role::text = 'executivo'");
    expect(rollback).toContain("drop index if exists public.deep_managers_linked_user_unique_idx");
    expect(rollback).toContain('create policy "gerente manages non-admin profiles"');
  });
});
