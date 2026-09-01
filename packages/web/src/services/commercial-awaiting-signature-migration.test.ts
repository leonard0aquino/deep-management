import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd(), "../..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260901112056_commercial_awaiting_signature_stage.sql"), "utf8");
const rollback = fs.readFileSync(path.join(root, "supabase/rollbacks/20260901112056_commercial_awaiting_signature_stage.sql"), "utf8");

describe("migração da etapa aguardando assinatura", () => {
  it("evolui enum, cockpit, escopos e RPC sem remover a assinatura anterior", () => {
    expect(migration).toContain("add value if not exists 'awaiting_signature' before 'won'");
    expect(migration).toContain("add column awaiting_signature_count integer not null default 0");
    expect(migration).toContain("'awaiting_signature', 'won'");
    expect(migration).toContain("guard_commercial_awaiting_signature_count");
    expect(migration).toContain("p_awaiting_signature_count integer");
    expect(migration).not.toContain("drop function if exists public.save_commercial_cockpit");
  });

  it("protege perda de dados e reconstrói o enum no rollback", () => {
    expect(rollback).toContain("Rollback bloqueado: existem dados na etapa Chamado aguardando assinatura.");
    expect(rollback).toContain("drop column awaiting_signature_count");
    expect(rollback).toContain("commercial_opportunity_stage_with_signature");
    expect(rollback).toContain("drop type public.commercial_opportunity_stage_with_signature");
    expect(rollback).toContain("create or replace function public.save_commercial_cockpit");
    expect(rollback).toContain("grant execute on function public.save_commercial_cockpit");
  });
});
