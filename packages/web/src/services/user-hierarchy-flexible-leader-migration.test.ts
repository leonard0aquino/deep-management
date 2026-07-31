import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "..", "..");
const migration = readFileSync(join(root, "supabase/migrations/20260731130000_allow_analyst_manager_leader.sql"), "utf8").toLowerCase();
const rollback = readFileSync(join(root, "supabase/rollbacks/20260731130000_allow_analyst_manager_leader.sql"), "utf8").toLowerCase();

describe("migração de liderança flexível do Analista", () => {
  it("aceita Supervisor ou Gerente como líder direto do Analista", () => {
    expect(migration).toContain("when 'analista' then array['supervisor', 'gerente']");
    expect(migration).toContain("when 'gerente' then array['supervisor', 'analista']");
    expect(migration).toContain("leader_role = any(allowed_leader_roles)");
  });

  it("restaura a cadeia estrita no rollback", () => {
    expect(rollback).toContain("when 'analista' then 'supervisor'");
    expect(rollback).toContain("when 'gerente' then 'supervisor'");
  });
});
