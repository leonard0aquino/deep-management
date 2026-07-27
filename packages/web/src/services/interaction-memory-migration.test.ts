// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("migration da memória estruturada de interações", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "../../supabase/migrations/20260727141739_interaction_memory.sql"),
    "utf8",
  );
  const rollback = readFileSync(
    resolve(process.cwd(), "../../supabase/rollbacks/20260727141739_interaction_memory.sql"),
    "utf8",
  );

  it("adiciona campos opcionais e defaults compatíveis com registros existentes", () => {
    expect(migration).toContain("create type public.customer_sentiment");
    expect(migration).toContain("add column decisions text");
    expect(migration).toContain("add column additional_participants text[] not null default '{}'");
    expect(migration).toContain("add column confidential boolean not null default false");
    expect(migration).toContain("drop view if exists public.interactions_view");
    expect(migration).toContain("create view public.interactions_view");
    expect(migration).toContain("alter view public.interactions_view set (security_invoker = true)");
  });

  it("remove as colunas e o enum no rollback", () => {
    expect(rollback).toContain("drop column if exists decisions");
    expect(rollback).toContain("drop column if exists additional_participants");
    expect(rollback).toContain("drop type if exists public.customer_sentiment");
    expect(rollback).toContain("create view public.interactions_view");
  });
});
