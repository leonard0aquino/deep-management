import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260804211523_commercial_user_owner_without_manager.sql"), "utf8").toLowerCase();
const rollback = readFileSync(resolve(root, "supabase/rollbacks/20260804211523_commercial_user_owner_without_manager.sql"), "utf8").toLowerCase();

describe("responsável Comercial sem gestor legado", () => {
  it("torna o gestor opcional somente no domínio de oportunidades", () => {
    expect(migration).toContain("alter column owner_manager_id drop not null");
    expect(migration).toContain("profile.business_area = 'commercial'");
    expect(migration).toContain("o responsável sem gestor vinculado deve pertencer à área comercial");
  });

  it("usa created_by para autoria e hierarquia quando o gestor é nulo", () => {
    expect(migration).toContain("private.can_access_commercial_user(created_by)");
    expect(migration).toContain("created_by = (select auth.uid())");
    expect(migration).toContain("new.created_by := old.created_by");
  });

  it("mantém o vínculo com gestor validado quando informado", () => {
    expect(migration).toContain("private.is_current_commercial_manager(owner_manager_id)");
    expect(migration).toContain("private.can_access_commercial_manager(owner_manager_id)");
  });

  it("possui rollback protegido contra perda de autoria", () => {
    expect(rollback).toContain("rollback bloqueado");
    expect(rollback).toContain("alter column owner_manager_id set not null");
  });
});
