import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260804083221_commercial_opportunity_funnel.sql"), "utf8").toLowerCase();
const rollback = readFileSync(resolve(root, "supabase/rollbacks/20260804083221_commercial_opportunity_funnel.sql"), "utf8").toLowerCase();

describe("migração do funil Comercial", () => {
  it("cria oportunidades e histórico de etapa com integridade", () => {
    expect(migration).toContain("create table public.commercial_opportunities");
    expect(migration).toContain("create table public.commercial_opportunity_stage_events");
    expect(migration).toContain("commercial_opportunity_loss_reason_check");
    expect(migration).toContain("references public.clients (id) on delete restrict");
    expect(migration).toContain("references public.deep_managers (id) on delete restrict");
  });

  it("audita toda criação, transição e reabertura", () => {
    expect(migration).toContain("new.stage is distinct from old.stage");
    expect(migration).toContain("commercial_opportunities_log_stage");
    expect(migration).toContain("new.closed_at := null");
    expect(migration).toContain("insert into public.commercial_opportunity_stage_events");
  });

  it("aplica RLS por área e estrutura em leitura e escrita", () => {
    expect(migration).toContain("with recursive caller as");
    expect(migration).toContain("where report.business_area = 'commercial'");
    expect(migration).toContain("for update to authenticated");
    expect(migration).toContain("using ((select private.can_access_commercial_manager(owner_manager_id)))");
    expect(migration).toContain("with check ((select private.can_access_commercial_manager(owner_manager_id)))");
  });

  it("não concede exclusão operacional e indexa os acessos principais", () => {
    expect(migration).not.toContain("grant delete on public.commercial_opportunities to authenticated");
    expect(migration).toContain("commercial_opportunities_owner_stage_idx");
    expect(migration).toContain("commercial_opportunities_stage_next_step_idx");
    expect(migration).toContain("commercial_opportunity_events_opportunity_created_idx");
  });

  it("possui rollback do domínio novo", () => {
    expect(rollback).toContain("drop table if exists public.commercial_opportunity_stage_events");
    expect(rollback).toContain("drop table if exists public.commercial_opportunities");
    expect(rollback).toContain("drop type if exists public.commercial_opportunity_stage");
  });
});
