import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(process.cwd(), "../..");
const migration = readFileSync(
  resolve(projectRoot, "supabase/migrations/20260729001525_health_score_future_guard.sql"),
  "utf8",
).toLowerCase();
const rollback = readFileSync(
  resolve(projectRoot, "supabase/rollbacks/20260729001525_health_score_future_guard.sql"),
  "utf8",
).toLowerCase();

describe("health score current projection migration", () => {
  it("usa a data civil de São Paulo e exclui interações futuras", () => {
    expect(migration).toContain("timezone('america/sao_paulo', now())::date as as_of_date");
    expect(migration).toContain("where i.occurred_at <= params.as_of_date");
    expect(migration).toContain("between params.as_of_date - 90 and params.as_of_date");
  });

  it("limita componentes e resultado composto entre zero e cem", () => {
    expect(migration.match(/least\(100::numeric, greatest\(0::numeric/g)).toHaveLength(6);
    expect(migration).toContain("as composite_score");
  });

  it("preserva as três views como security invoker", () => {
    expect(migration).toContain("create view public.client_product_matrix");
    expect(migration).toContain("create view public.client_health");
    expect(migration).toContain("create view public.health_score");
    expect(migration.match(/security_invoker = true/g)).toHaveLength(3);
    expect(migration.match(/grant select on public\./g)).toHaveLength(3);
    expect(migration.match(/from anon, authenticated/g)).toHaveLength(3);
  });

  it("possui rollback completo para a definição anterior", () => {
    expect(rollback).toContain("create view public.client_product_matrix");
    expect(rollback).toContain("create view public.client_health");
    expect(rollback).toContain("create view public.health_score");
    expect(rollback).toContain("current_date - agg.last_contact");
    expect(rollback).not.toContain("america/sao_paulo");
    expect(rollback.match(/security_invoker = true/g)).toHaveLength(3);
    expect(rollback.match(/grant select on public\./g)).toHaveLength(3);
  });
});
