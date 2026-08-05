import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260805090000_commercial_manual_cockpit.sql"), "utf8").toLowerCase();
const privileges = readFileSync(resolve(root, "supabase/migrations/20260805100500_commercial_manual_cockpit_privileges.sql"), "utf8").toLowerCase();
const rollback = readFileSync(resolve(root, "supabase/rollbacks/20260805090000_commercial_manual_cockpit.sql"), "utf8").toLowerCase();

describe("migração do cockpit Comercial manual", () => {
  it("cria as duas fontes manuais sem remover o funil estruturado existente", () => {
    expect(migration).toContain("create table public.commercial_cockpit_states");
    expect(migration).toContain("create table public.commercial_agenda_entries");
    expect(migration).not.toContain("drop table public.commercial_opportunities");
    expect(migration).not.toContain("drop table public.commercial_opportunity_stage_events");
  });

  it("aplica RLS hierárquica, escrita autenticada e nenhuma exclusão", () => {
    expect(migration).toContain("enable row level security");
    expect(migration.match(/private\.can_access_commercial_user\(owner_user_id\)/g)).toHaveLength(8);
    expect(migration).toContain("grant select, insert, update on public.commercial_cockpit_states to authenticated");
    expect(migration).toContain("grant select, insert, update on public.commercial_agenda_entries to authenticated");
    expect(migration).toContain("revoke all on public.commercial_cockpit_states from public, anon, authenticated");
    expect(privileges).toContain("revoke all on public.commercial_agenda_entries from public, anon, authenticated");
    expect(migration).toContain("commercial_agenda_created_by_idx");
    expect(migration).toContain("commercial_agenda_updated_by_idx");
    expect(migration).not.toContain("for delete to authenticated");
    expect(migration).not.toContain("grant delete");
  });

  it("bloqueia datas futuras, sincroniza conclusão e registra auditoria", () => {
    expect(migration).toContain("eventos realizados não podem possuir data futura");
    expect(migration).toContain("um compromisso futuro não pode ser marcado como concluído");
    expect(migration).toContain("sync_completed_commercial_agenda_entry");
    expect(migration.match(/execute function public\.audit_trigger\(\)/g)).toHaveLength(2);
  });

  it("fornece rollback protegido contra perda de dados", () => {
    expect(rollback).toContain("rollback bloqueado: existem dados manuais no cockpit comercial");
    expect(rollback).toContain("drop table if exists public.commercial_agenda_entries");
    expect(rollback).toContain("drop table if exists public.commercial_cockpit_states");
  });
});
