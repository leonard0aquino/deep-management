import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260810131904_business_days_and_teams_contact.sql"),
  "utf8",
).toLowerCase();
const rollback = readFileSync(
  resolve(root, "supabase/rollbacks/20260810131904_business_days_and_teams_contact.sql"),
  "utf8",
).toLowerCase();

describe("migração de dias úteis e Contato no Teams", () => {
  it("adiciona o canal Teams sem duplicar o enum", () => {
    expect(migration).toContain("alter type public.interaction_type add value if not exists 'teams'");
  });

  it("conta somente segunda a sexta após o último contato", () => {
    expect(migration).toContain("create or replace function public.business_days_between");
    expect(migration).toContain("extract(isodow from p_start_date + remaining.day_offset) < 6");
    expect(migration).toContain("when p_end_date <= p_start_date then 0");
  });

  it("aplica dias úteis em todas as visões de recência", () => {
    expect(migration).toContain("create or replace view public.interactions_view");
    expect(migration).toContain("create view public.client_product_matrix");
    expect(migration).toContain("create or replace view public.stakeholder_health");
    expect(migration.match(/age\.days_since_contact/g)?.length).toBeGreaterThanOrEqual(10);
    expect(migration.match(/with \(security_invoker = true\)/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("mantém um rollback operacional sem tentar remover o enum", () => {
    expect(rollback).toContain("greatest(p_end_date - p_start_date, 0)");
    expect(rollback).not.toContain("drop type");
  });
});
