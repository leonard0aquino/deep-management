import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260804204627_commercial_company_contact_owner_governance.sql"), "utf8").toLowerCase();
const rollback = readFileSync(resolve(root, "supabase/rollbacks/20260804204627_commercial_company_contact_owner_governance.sql"), "utf8").toLowerCase();

describe("governança de empresa, contato e autoria Comercial", () => {
  it("vincula contato à oportunidade e valida que pertence à empresa", () => {
    expect(migration).toContain("add column if not exists contact_id uuid references public.client_contacts");
    expect(migration).toContain("commercial_opportunities_contact_idx");
    expect(migration).toContain("contact.id = new.contact_id and contact.client_id = new.client_id");
  });

  it("permite ao Comercial criar somente prospect sem dados de contrato", () => {
    expect(migration).toContain('create policy "commercial users create prospects"');
    expect(migration).toContain("profile.business_area = 'commercial'");
    expect(migration).toContain("client_kind = 'prospect'");
    expect(migration).toContain("contract_value is null");
  });

  it("trava novas oportunidades no gestor vinculado ao login", () => {
    expect(migration).toContain("manager.linked_user_id = (select auth.uid())");
    expect(migration).toContain('create policy "commercial user creates own opportunities"');
    expect(migration).toContain("private.is_current_commercial_manager(owner_manager_id)");
  });

  it("possui rollback específico", () => {
    expect(rollback).toContain("drop column if exists contact_id");
    expect(rollback).toContain("drop policy if exists \"commercial users create prospects\"");
    expect(rollback).toContain("drop function if exists private.is_current_commercial_manager");
  });
});
