import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260729003224_client_product_ownership.sql"), "utf8").toLowerCase();
const rollback = readFileSync(resolve(root, "supabase/rollbacks/20260729003224_client_product_ownership.sql"), "utf8").toLowerCase();

describe("client product ownership migration", () => {
  it("adiciona responsabilidade na combinação e preserva unicidade", () => {
    expect(migration).toContain("alter table public.client_products");
    expect(migration).toContain("add column owner_manager_id uuid references public.deep_managers");
    expect(migration).toContain("client_products_owner_manager_id_idx");
    expect(migration).toContain("on conflict (client_id, product_id) do nothing");
  });

  it("preenche vínculos existentes e cria combinações observadas", () => {
    expect(migration).toContain("set owner_manager_id = c.owner_manager_id");
    expect(migration).toContain("partition by i.client_id, i.product_id");
    expect(migration).toContain("insert into public.client_products (client_id, product_id, owner_manager_id)");
  });

  it("aceita responsável opcional na importação de contratos", () => {
    expect(migration).toContain("client_id, product_id, owner_manager_id, contract_value, renewal_date");
    expect(migration).toContain("nullif(item->>'owner_manager_id', '')::uuid");
  });

  it("remove acesso anônimo e preserva escrita autenticada sob RLS", () => {
    expect(migration).toContain("revoke all on public.client_products from anon, authenticated");
    expect(migration).toContain("grant select, insert, update, delete on public.client_products to authenticated");
    expect(migration).toContain("grant all on public.client_products to service_role");
  });

  it("restaura a função anterior antes de remover somente a nova coluna", () => {
    expect(rollback).toContain("create or replace function public.import_structured_data");
    expect(rollback).toContain("insert into public.client_products (client_id, product_id, contract_value, renewal_date)");
    expect(rollback).toContain("drop index if exists public.client_products_owner_manager_id_idx");
    expect(rollback).toContain("alter table public.client_products drop column if exists owner_manager_id");
    expect(rollback).not.toContain("drop table");
  });
});
