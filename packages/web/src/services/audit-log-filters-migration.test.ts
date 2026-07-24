// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("migration de filtros/paginação no audit_log", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "../../supabase/migrations/20260724140000_audit_log_filters.sql"),
    "utf8",
  );
  const rollback = readFileSync(
    resolve(process.cwd(), "../../supabase/rollbacks/20260724140000_audit_log_filters.sql"),
    "utf8",
  );

  it("substitui a function por uma versão com offset e filtros", () => {
    expect(migration).toContain("drop function if exists public.get_audit_log(int);");
    expect(migration).toContain("p_offset int default 0");
    expect(migration).toContain("p_action text default null");
    expect(migration).toContain("p_table_name text default null");
    expect(migration).toContain("p_actor uuid default null");
    expect(migration).toContain("p_search text default null");
    expect(migration).toContain("limit p_limit offset p_offset");
  });

  it("libera execução da nova assinatura para authenticated", () => {
    expect(migration).toContain(
      "grant execute on function public.get_audit_log(int, int, text, text, uuid, text) to authenticated",
    );
  });

  it("rollback remove a versão nova e restaura a assinatura anterior", () => {
    expect(rollback).toContain("drop function if exists public.get_audit_log(int, int, text, text, uuid, text)");
    expect(rollback).toContain("create or replace function public.get_audit_log(p_limit int default 30)");
    expect(rollback).toContain("grant execute on function public.get_audit_log(int) to authenticated");
  });
});
