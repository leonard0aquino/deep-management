import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260728200000_client_cadence_playbooks.sql"), "utf8");
const rollback = readFileSync(resolve(root, "supabase/rollbacks/20260728200000_client_cadence_playbooks.sql"), "utf8");
const correction = readFileSync(resolve(root, "supabase/migrations/20260728200100_client_cadence_status_cast.sql"), "utf8");

describe("client cadence playbooks migration", () => {
  it("modela biblioteca, etapas ordenadas e uma cadência ativa por cliente e produto", () => {
    expect(migration).toContain("create table public.customer_playbooks");
    expect(migration).toContain("create table public.customer_playbook_steps");
    expect(migration).toContain("unique (playbook_id, position)");
    expect(migration).toContain("create table public.client_cadences");
    expect(migration).toContain("where status = 'active'");
  });

  it("materializa etapas atomicamente em tarefas com prazo e chave determinística", () => {
    expect(migration).toContain("create or replace function public.apply_customer_playbook");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("p_start_date + step.day_offset");
    expect(migration).toContain("'cadence:' || cadence_id::text || ':step:' || step.id::text");
    expect(migration).toContain("an active cadence already exists for this client and product");
    expect(migration).toContain("active playbook not found");
  });

  it("deriva conclusão, reabertura, progresso e próxima tarefa sem duplicar estado", () => {
    expect(migration).toContain("create or replace function private.refresh_client_cadence_status");
    expect(migration).toContain("after insert or update of status on public.action_tasks");
    expect(migration).toContain("'active'::public.client_cadence_status");
    expect(correction).toContain("'completed'::public.client_cadence_status");
    expect(migration).toContain("create view public.client_cadence_progress");
    expect(migration).toContain("with (security_invoker = true)");
    expect(migration).toContain("count(task.id) filter (where task.status in ('completed', 'dismissed'))");
    expect(migration).toContain("order by candidate.due_date, candidate.created_at");
  });

  it("protege tabelas com RLS, grants explícitos e rollback completo", () => {
    expect(migration).toContain("alter table public.customer_playbooks enable row level security");
    expect(migration).toContain("gerente+ insert customer playbooks");
    expect(migration).toContain("grant select, insert, update on table public.customer_playbooks to authenticated");
    expect(migration).not.toContain("grant truncate");
    expect(rollback).toContain("drop view if exists public.client_cadence_progress");
    expect(rollback).toContain("drop column if exists client_cadence_id");
    expect(rollback).toContain("drop table if exists public.customer_playbooks");
    expect(rollback).toContain("drop type if exists public.client_cadence_status");
  });
});
