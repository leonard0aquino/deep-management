import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260728183000_stakeholder_relationship_map.sql"), "utf8");
const rollback = readFileSync(resolve(root, "supabase/rollbacks/20260728183000_stakeholder_relationship_map.sql"), "utf8");

describe("stakeholder relationship map migration", () => {
  it("adiciona papel controlado, responsável e índice", () => {
    expect(migration).toContain("create type public.stakeholder_relationship_role as enum");
    expect(migration).toContain("relationship_role public.stakeholder_relationship_role");
    expect(migration).toContain("owner_manager_id uuid references public.deep_managers");
    expect(migration).toContain("client_contacts_role_owner_idx");
  });

  it("recria a view segura com sentimento explicitamente registrado", () => {
    expect(migration).toContain("create view public.stakeholder_health");
    expect(migration).toContain("with (security_invoker = true)");
    expect(migration).toContain("i.customer_sentiment as last_customer_sentiment");
    expect(migration).toContain("i.occurred_at as sentiment_recorded_at");
  });

  it("limita privilégios autenticados ao CRUD e preserva RLS da base", () => {
    expect(migration).toContain("revoke all on table public.client_contacts from authenticated");
    expect(migration).toContain("grant select, insert, update, delete on table public.client_contacts to authenticated");
    expect(migration).toContain("grant select on table public.stakeholder_health to authenticated");
    expect(migration).not.toContain("disable row level security");
  });

  it("possui rollback do schema e da view", () => {
    expect(rollback).toContain("drop column if exists owner_manager_id");
    expect(rollback).toContain("drop column if exists relationship_role");
    expect(rollback).toContain("drop type if exists public.stakeholder_relationship_role");
    expect(rollback).toContain("create view public.stakeholder_health");
  });
});
