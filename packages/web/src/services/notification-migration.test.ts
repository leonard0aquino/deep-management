// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("migration de auditoria das notificações", () => {
  const migration = readFileSync(resolve(process.cwd(), "../../supabase/migrations/20260722194000_notification_audit.sql"), "utf8");
  const rollback = readFileSync(resolve(process.cwd(), "../../supabase/rollbacks/20260722194000_notification_audit.sql"), "utf8");
  it("instala auditoria nas duas tabelas", () => {
    expect(migration).toContain("create trigger audit_notifications");
    expect(migration).toContain("create trigger audit_notification_preferences");
    expect(migration).toContain("execute function public.audit_trigger()");
  });
  it("remove ambos os triggers no rollback", () => {
    expect(rollback).toContain("drop trigger if exists audit_notifications");
    expect(rollback).toContain("drop trigger if exists audit_notification_preferences");
  });
});
