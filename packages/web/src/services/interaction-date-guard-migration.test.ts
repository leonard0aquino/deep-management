import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(process.cwd(), "../..");
const migration = readFileSync(
  resolve(projectRoot, "supabase/migrations/20260730092656_prevent_future_interactions.sql"),
  "utf8",
).toLowerCase();
const rollback = readFileSync(
  resolve(projectRoot, "supabase/rollbacks/20260730092656_prevent_future_interactions.sql"),
  "utf8",
).toLowerCase();

describe("interaction future date guard migration", () => {
  it("bloqueia data posterior à criação na data civil de São Paulo", () => {
    expect(migration).toContain("add constraint interactions_occurred_at_not_future");
    expect(migration).toContain("occurred_at <= timezone('america/sao_paulo', created_at)::date");
  });

  it("possui rollback da constraint", () => {
    expect(rollback).toContain("drop constraint if exists interactions_occurred_at_not_future");
  });
});
