import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260727160840_client_ownership_governance.sql"),
  "utf8",
);
const rollback = readFileSync(
  resolve(root, "supabase/rollbacks/20260727160840_client_ownership_governance.sql"),
  "utf8",
);

describe("migration de governança e responsabilidade do cliente", () => {
  it("cria vínculo opcional, índice e documentação no schema", () => {
    expect(migration).toContain("add column owner_manager_id uuid references public.deep_managers (id) on delete set null");
    expect(migration).toContain("create index clients_owner_manager_id_idx");
    expect(migration).toContain("comment on column public.clients.owner_manager_id");
    expect(migration).not.toContain("owner_manager_id uuid not null");
  });

  it("faz backfill determinístico somente com responsável ativo e evidência existente", () => {
    expect(migration).toContain("row_number() over");
    expect(migration).toContain("partition by i.client_id");
    expect(migration).toContain("order by i.occurred_at desc, i.updated_at desc, i.id desc");
    expect(migration).toContain("m.id = i.manager_id and m.active = true");
    expect(migration).toContain("and c.owner_manager_id is null");
  });

  it("preserva as policies existentes e possui rollback completo", () => {
    expect(migration).not.toContain("create policy");
    expect(migration).not.toContain("drop policy");
    expect(rollback).toContain("drop index if exists public.clients_owner_manager_id_idx");
    expect(rollback).toContain("drop column if exists owner_manager_id");
  });
});
