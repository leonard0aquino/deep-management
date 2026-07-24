// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("migration de detalhes do ator no audit_log", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "../../supabase/migrations/20260724130000_audit_log_actor_details.sql"),
    "utf8",
  );
  const rollback = readFileSync(
    resolve(process.cwd(), "../../supabase/rollbacks/20260724130000_audit_log_actor_details.sql"),
    "utf8",
  );

  it("cria a function que junta audit_log com user_profiles/auth.users", () => {
    expect(migration).toContain("create or replace function public.get_audit_log");
    expect(migration).toContain("left join public.user_profiles p on p.id = a.actor");
    expect(migration).toContain("left join auth.users u on u.id = a.actor");
    expect(migration).toContain("where public.is_admin()");
  });

  it("libera execução para authenticated", () => {
    expect(migration).toContain("grant execute on function public.get_audit_log(int) to authenticated");
  });

  it("remove a function no rollback", () => {
    expect(rollback).toContain("drop function if exists public.get_audit_log(int)");
  });
});
