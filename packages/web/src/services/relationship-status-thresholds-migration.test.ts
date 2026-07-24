// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("migration de thresholds configuráveis do status de relacionamento", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "../../supabase/migrations/20260724150000_relationship_status_thresholds.sql"),
    "utf8",
  );
  const rollback = readFileSync(
    resolve(process.cwd(), "../../supabase/rollbacks/20260724150000_relationship_status_thresholds.sql"),
    "utf8",
  );

  it("adiciona as 4 colunas de threshold com os padrões atuais (7/21/45/90)", () => {
    expect(migration).toContain("add column threshold_recente_dias int not null default 7");
    expect(migration).toContain("add column threshold_ok_dias int not null default 21");
    expect(migration).toContain("add column threshold_atencao_dias int not null default 45");
    expect(migration).toContain("add column threshold_alerta_dias int not null default 90");
  });

  it("garante ordem crescente entre os thresholds via constraint", () => {
    expect(migration).toContain("health_score_settings_thresholds_order");
    expect(migration).toContain("threshold_recente_dias < threshold_ok_dias");
    expect(migration).toContain("threshold_ok_dias < threshold_atencao_dias");
    expect(migration).toContain("threshold_atencao_dias < threshold_alerta_dias");
  });

  it("recria interactions_view e client_product_matrix lendo de health_score_settings", () => {
    expect(migration).toContain("cross join (select * from public.health_score_settings limit 1) s");
    expect(migration).toContain("(current_date - i.occurred_at) <= s.threshold_recente_dias");
    expect(migration).toContain("(current_date - agg.last_contact) <= weights.threshold_recente_dias");
    expect(migration).not.toContain("<= 7 then 'recente'");
  });

  it("rollback restaura os thresholds fixos (7/21/45/90) e remove as colunas", () => {
    expect(rollback).toContain("<= 7 then 'recente'");
    expect(rollback).toContain("<= 21 then 'ok'");
    expect(rollback).toContain("<= 45 then 'atencao'");
    expect(rollback).toContain("<= 90 then 'alerta'");
    expect(rollback).toContain("drop column if exists threshold_recente_dias");
    expect(rollback).toContain("drop constraint if exists health_score_settings_thresholds_order");
  });
});
