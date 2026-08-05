import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260805113000_commercial_stage_scope.sql"), "utf8").toLowerCase();
const rollback = readFileSync(resolve(root, "supabase/rollbacks/20260805113000_commercial_stage_scope.sql"), "utf8").toLowerCase();

describe("migração de responsabilidade Comercial por etapa", () => {
  it("cria configuração normalizada, indexada e com backfill das quatro etapas", () => {
    expect(migration).toContain("create table public.commercial_user_stage_scopes");
    expect(migration).toContain("unique (owner_user_id, stage)");
    expect(migration).toContain("commercial_stage_scopes_active_owner_idx");
    expect(migration).toContain("values ('prospecting'), ('meetings'), ('nda_poc'), ('won')");
    expect(migration).toContain("where profile.business_area = 'commercial'");
  });

  it("aplica RLS hierárquica e reserva escrita ao Admin sem acesso anônimo", () => {
    expect(migration).toContain("alter table public.commercial_user_stage_scopes enable row level security");
    expect(migration).toContain("private.can_access_commercial_user(owner_user_id)");
    expect(migration.match(/select public\.is_admin\(\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration).toContain("revoke all on public.commercial_user_stage_scopes from public, anon, authenticated");
    expect(migration).toContain("grant select, insert, update on public.commercial_user_stage_scopes to authenticated");
    expect(migration).not.toContain("grant delete");
  });

  it("audita atribuições e protege cockpit e agenda por etapa no banco", () => {
    expect(migration).toContain("execute function public.audit_trigger()");
    expect(migration).toContain("caller_id is null and pg_trigger_depth() > 1");
    expect(migration).toContain("caller_id := new.updated_by");
    expect(migration).toContain("private.commercial_user_has_stage(new.owner_user_id, 'prospecting')");
    expect(migration).toContain("private.commercial_user_has_stage(new.owner_user_id, 'meetings')");
    expect(migration).toContain("private.commercial_user_has_stage(new.owner_user_id, 'nda_poc')");
    expect(migration).toContain("private.commercial_user_has_stage(new.owner_user_id, 'won')");
    expect(migration).toContain("when 'proposal' then 'nda_poc'");
    expect(migration).toContain("o responsável não possui a etapa exigida por este compromisso");
  });

  it("sincroniza defaults ao classificar usuários e protege rollback customizado", () => {
    expect(migration).toContain("create trigger sync_default_commercial_stage_scopes");
    expect(migration).toContain("on conflict (owner_user_id, stage) do update");
    expect(rollback).toContain("rollback bloqueado: existem responsabilidades comerciais personalizadas");
    expect(rollback).toContain("where profile.business_area = 'commercial'");
    expect(rollback).toContain("drop table public.commercial_user_stage_scopes");
  });
});
