import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260727153943_action_tasks.sql"), "utf8");
const rollback = readFileSync(resolve(root, "supabase/rollbacks/20260727153943_action_tasks.sql"), "utf8");
const actorIndexesMigration = readFileSync(
  resolve(root, "supabase/migrations/20260727154258_action_task_actor_indexes.sql"),
  "utf8",
);
const actorIndexesRollback = readFileSync(
  resolve(root, "supabase/rollbacks/20260727154258_action_task_actor_indexes.sql"),
  "utf8",
);

describe("migration de tarefas da Central de Ações", () => {
  it("cria estado compartilhado, histórico, unicidade, índices e RLS", () => {
    expect(migration).toContain("create table if not exists public.action_tasks");
    expect(migration).toContain("create table if not exists public.action_task_events");
    expect(migration).toContain("action_tasks_action_key_unique unique (action_key)");
    expect(migration).toContain("into new.client_name, new.product_name");
    expect(migration).toContain("action_tasks_status_due_date_idx");
    expect(migration).toContain("action_task_events_task_created_idx");
    expect(migration).toContain("alter table public.action_tasks enable row level security");
    expect(migration).toContain("using ((select private.is_internal_user()))");
    expect(migration).toContain("grant select, insert, update on table public.action_tasks to authenticated");
    expect(migration).toContain("grant select on table public.action_task_events to authenticated");
  });

  it("registra eventos por trigger e protege transições e campos obrigatórios", () => {
    expect(migration).toContain("create trigger action_tasks_log_event");
    expect(migration).toContain("invalid action task transition");
    expect(migration).toContain("postponed task requires a future due date");
    expect(migration).toContain("action_tasks_dismissed_justification");
    expect(migration).toContain("action_tasks_completed_result");
  });

  it("não altera a tabela legada e possui rollback completo", () => {
    expect(migration).not.toContain("alter table public.action_decisions");
    expect(migration).not.toContain("drop table public.action_decisions");
    expect(rollback).toContain("drop table if exists public.action_task_events");
    expect(rollback).toContain("drop table if exists public.action_tasks");
    expect(rollback).toContain("drop function if exists public.get_assignable_action_users()");
  });

  it("indexa as chaves estrangeiras de autoria e oferece rollback", () => {
    expect(actorIndexesMigration).toContain("action_tasks_created_by_idx");
    expect(actorIndexesMigration).toContain("action_tasks_updated_by_idx");
    expect(actorIndexesRollback).toContain("drop index if exists public.action_tasks_created_by_idx");
    expect(actorIndexesRollback).toContain("drop index if exists public.action_tasks_updated_by_idx");
  });
});
