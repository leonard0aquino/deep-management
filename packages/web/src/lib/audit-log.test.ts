import { describe, expect, it } from "vitest";
import { auditEntriesToCsv, changedFields, describeAuditEntry } from "@/lib/audit-log";
import type { AuditLogEntry } from "@/lib/types/database";

function entry(overrides: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: "1",
    table_name: "clients",
    record_id: "c1",
    action: "INSERT",
    actor: "u1",
    actor_name: "Maria",
    actor_email: "maria@deep.com",
    diff: { name: "Acme Corp" },
    created_at: "2026-07-24T10:00:00.000Z",
    ...overrides,
  };
}

describe("describeAuditEntry", () => {
  it("descreve criação com o nome do registro", () => {
    expect(describeAuditEntry(entry({}))).toBe('Maria criou cliente "Acme Corp"');
  });

  it("descreve remoção", () => {
    expect(
      describeAuditEntry(entry({ action: "DELETE", diff: { name: "Acme Corp" } })),
    ).toBe('Maria removeu cliente "Acme Corp"');
  });

  it("descreve atualização usando o estado 'after' do diff", () => {
    expect(
      describeAuditEntry(
        entry({
          action: "UPDATE",
          diff: { before: { name: "Acme" }, after: { name: "Acme Corp" } },
        }),
      ),
    ).toBe('Maria atualizou cliente "Acme Corp"');
  });

  it("cai para e-mail quando não há nome do ator", () => {
    expect(describeAuditEntry(entry({ actor_name: null }))).toBe(
      'maria@deep.com criou cliente "Acme Corp"',
    );
  });

  it("cai para 'Alguém' quando não há ator identificado", () => {
    expect(describeAuditEntry(entry({ actor_name: null, actor_email: null }))).toBe(
      'Alguém criou cliente "Acme Corp"',
    );
  });

  it("omite o rótulo quando o diff não tem campo identificável", () => {
    expect(describeAuditEntry(entry({ diff: { value: 42 } }))).toBe("Maria criou cliente");
  });

  it("usa o rótulo de tabela genérico quando não mapeado", () => {
    expect(describeAuditEntry(entry({ table_name: "unknown_table", diff: {} }))).toBe(
      "Maria criou unknown_table",
    );
  });
});

describe("changedFields", () => {
  it("lista apenas os campos que mudaram entre before/after", () => {
    const result = changedFields(
      entry({
        action: "UPDATE",
        diff: {
          before: { name: "Acme", active: true, contract_value: 100 },
          after: { name: "Acme Corp", active: true, contract_value: 150 },
        },
      }),
    );
    expect(result).toEqual(["name", "contract_value"]);
  });

  it("retorna vazio para INSERT/DELETE", () => {
    expect(changedFields(entry({ action: "INSERT" }))).toEqual([]);
    expect(changedFields(entry({ action: "DELETE" }))).toEqual([]);
  });

  it("retorna vazio quando o diff não tem before/after", () => {
    expect(changedFields(entry({ action: "UPDATE", diff: { name: "Acme" } }))).toEqual([]);
  });
});

describe("auditEntriesToCsv", () => {
  it("gera cabeçalho e uma linha por entrada", () => {
    const csv = auditEntriesToCsv([entry({})]);
    const [header, row] = csv.split("\n");
    expect(header).toBe(
      "created_at,action,table_name,record_id,actor_name,actor_email,description,changed_fields",
    );
    expect(row).toBe(
      '2026-07-24T10:00:00.000Z,INSERT,clients,c1,Maria,maria@deep.com,"Maria criou cliente ""Acme Corp""",',
    );
  });

  it("escapa campos com vírgula, aspas ou quebra de linha", () => {
    const csv = auditEntriesToCsv([
      entry({
        action: "UPDATE",
        diff: { before: { name: "Acme" }, after: { name: 'Acme, Inc "Corp"' } },
      }),
    ]);
    const [, row] = csv.split("\n");
    expect(row).toContain('"Maria atualizou cliente ""Acme, Inc ""Corp"""""');
    expect(row.endsWith(",name")).toBe(true);
  });

  it("retorna só o cabeçalho quando não há entradas", () => {
    expect(auditEntriesToCsv([])).toBe(
      "created_at,action,table_name,record_id,actor_name,actor_email,description,changed_fields",
    );
  });
});
