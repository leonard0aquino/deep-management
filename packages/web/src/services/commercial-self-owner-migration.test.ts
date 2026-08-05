import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260805114150_commercial_self_owner.sql"), "utf8").toLowerCase();
const rollback = readFileSync(resolve(root, "supabase/rollbacks/20260805114150_commercial_self_owner.sql"), "utf8").toLowerCase();

describe("migração de autoria Comercial vinculada ao login", () => {
  it("substitui escrita hierárquica por políticas exclusivas do proprietário", () => {
    expect(migration).toContain('drop policy if exists "commercial hierarchy creates cockpit states"');
    expect(migration).toContain('drop policy if exists "commercial hierarchy updates agenda"');
    expect(migration.match(/owner_user_id = \(select auth\.uid\(\)\)/g)?.length).toBeGreaterThanOrEqual(6);
    expect(migration).toContain('create policy "commercial owner updates cockpit states"');
    expect(migration).toContain('create policy "commercial owner updates agenda"');
  });

  it("protege autoria também por trigger e torna o proprietário imutável", () => {
    expect(migration).toContain("create or replace function private.guard_commercial_self_owner()");
    expect(migration).toContain("new.owner_user_id is distinct from old.owner_user_id");
    expect(migration).toContain("o responsável comercial não pode ser alterado");
    expect(migration).toContain("o responsável comercial deve ser o usuário autenticado");
    expect(migration).toContain("revoke all on function private.guard_commercial_self_owner()");
  });

  it("restaura as políticas hierárquicas no rollback", () => {
    expect(rollback).toContain("drop function if exists private.guard_commercial_self_owner()");
    expect(rollback).toContain('create policy "commercial hierarchy creates cockpit states"');
    expect(rollback).toContain('create policy "commercial hierarchy updates agenda"');
    expect(rollback).toContain("private.can_access_commercial_user(owner_user_id)");
  });
});
