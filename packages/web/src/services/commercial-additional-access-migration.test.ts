import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260814112346_commercial_additional_access.sql"), "utf8");
const rollback = readFileSync(resolve(root, "supabase/rollbacks/20260814112346_commercial_additional_access.sql"), "utf8");
const hardening = readFileSync(resolve(root, "supabase/migrations/20260814113304_commercial_additional_access_hardening.sql"), "utf8");

describe("acesso Comercial complementar", () => {
  it("adiciona uma concessão operacional segura sem alterar a área principal", () => {
    expect(migration).toContain("add column if not exists commercial_access boolean not null default false");
    expect(migration).toContain("private.is_commercial_user");
    expect(migration).toContain("update of business_area, commercial_access");
    expect(migration).toContain("values ('prospecting'), ('meetings'), ('nda_poc'), ('won')");
    expect(migration).not.toContain("set business_area");
  });

  it("possui rollback explícito", () => {
    expect(rollback).toContain("drop column if exists commercial_access");
    expect(rollback).toContain("disable trigger prepare_commercial_stage_scope");
    expect(rollback).toContain("profile.commercial_access");
  });

  it("protege a hierarquia Comercial contra ciclos", () => {
    expect(hardening).toContain("select caller.id from caller\n    union\n");
    expect(hardening).not.toContain("select caller.id from caller\n    union all\n");
  });
});
