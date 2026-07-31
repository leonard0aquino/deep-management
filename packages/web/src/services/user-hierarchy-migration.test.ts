import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "..", "..");
const migration = readFileSync(join(root, "supabase/migrations/20260731120000_user_hierarchy.sql"), "utf8").toLowerCase();
const rollback = readFileSync(join(root, "supabase/rollbacks/20260731120000_user_hierarchy.sql"), "utf8").toLowerCase();

describe("migração da hierarquia de usuários", () => {
  it("adiciona Supervisor, líder direto e valida a cadeia no banco", () => {
    expect(migration).toContain("alter type public.user_role add value if not exists 'supervisor'");
    expect(migration).toContain("add column manager_user_id uuid references public.user_profiles");
    expect(migration).toContain("user_profiles_manager_user_idx");
    expect(migration).toContain("validate_user_hierarchy_before_write");
    expect(migration).toContain("when 'gerente' then 'executivo'");
    expect(migration).toContain("when 'supervisor' then 'gerente'");
    expect(migration).toContain("when 'analista' then 'supervisor'");
    expect(migration).toContain("um usuário não pode ser seu próprio líder");
    expect(migration).toContain("o novo papel invalida subordinados diretos existentes");
    expect(migration).toContain("role::text in ('admin', 'gerente', 'supervisor')");
    expect(migration).toContain('create policy "managers update contracted products"');
  });

  it("remove os objetos e converte Supervisores no rollback", () => {
    expect(rollback).toContain("drop trigger if exists validate_user_hierarchy_before_write");
    expect(rollback).toContain("drop function if exists public.validate_user_hierarchy");
    expect(rollback).toContain("drop column if exists manager_user_id");
    expect(rollback).toContain("where role::text = 'supervisor'");
    expect(rollback).toContain("'admin', 'executivo', 'gerente', 'analista'");
    expect(rollback).toContain("role::text in ('admin', 'gerente')");
  });
});
