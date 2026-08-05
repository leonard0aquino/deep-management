import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260805134326_jira_csv_pilot.sql"), "utf8").toLowerCase();
const rollback = readFileSync(resolve(root, "supabase/rollbacks/20260805134326_jira_csv_pilot.sql"), "utf8").toLowerCase();

describe("migração do piloto Jira CSV", () => {
  it("cria projeto, cards e lotes com unicidade idempotente", () => {
    expect(migration).toContain("create table public.jira_projects");
    expect(migration).toContain("create table public.jira_issues");
    expect(migration).toContain("create table public.jira_import_batches");
    expect(migration).toContain("unique (project_id, issue_key)");
    expect(migration).toContain("on conflict (project_id, issue_key) do update");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("set active = false");
    expect(migration).toContain("active = true");
  });

  it("habilita RLS, usa grants explícitos e restringe escrita a admin", () => {
    expect(migration.match(/enable row level security/g)?.length).toBe(3);
    expect(migration).toContain("revoke all on public.jira_projects, public.jira_issues, public.jira_import_batches from anon, authenticated");
    expect(migration).toContain('create policy "authenticated read jira issues"');
    expect(migration.match(/profile\.role in \('admin', 'executivo', 'gerente', 'supervisor'\)/g)?.length).toBe(3);
    expect(migration).not.toContain("for select to authenticated using (true)");
    expect(migration).toContain('create policy "admin inserts jira issues"');
    expect(migration).toContain("public.is_admin()");
  });

  it("mantém a função como invoker, valida autenticação e limita execução", () => {
    expect(migration).toContain("security invoker");
    expect(migration).toContain("v_user_id is null or not public.is_admin()");
    expect(migration).toContain("revoke all on function public.import_jira_issues");
    expect(migration).toContain("grant execute on function public.import_jira_issues");
  });

  it("remove somente os objetos novos no rollback", () => {
    expect(rollback).toContain("drop function if exists public.import_jira_issues");
    expect(rollback).toContain("drop table if exists public.jira_import_batches");
    expect(rollback).toContain("drop table if exists public.jira_issues");
    expect(rollback).toContain("drop table if exists public.jira_projects");
  });
});
