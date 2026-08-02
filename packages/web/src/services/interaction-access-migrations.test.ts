// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readMigration = (name: string) => readFileSync(
  resolve(process.cwd(), `../../supabase/migrations/${name}.sql`),
  "utf8",
);

describe("migrations de acesso ao formulário de interação", () => {
  it("permite que usuários autenticados criem contatos", () => {
    const migration = readMigration("20260727151200_allow_analyst_create_client_contacts");
    expect(migration).toContain('create policy "authenticated insert client_contacts"');
    expect(migration).toContain("for insert to authenticated");
    expect(migration).toContain("where id = (select auth.uid())");
  });

  it("força o responsável e a autoria pelo usuário autenticado", () => {
    const migration = readMigration("20260802182352_set_interaction_responsible_from_authenticated_user");
    expect(migration).toContain("new.created_by := authenticated_user_id");
    expect(migration).toContain("manager.linked_user_id = authenticated_user_id");
    expect(migration).toContain("before insert on public.interactions");
    expect(migration).toContain("with check (created_by = (select auth.uid()))");
  });
});
