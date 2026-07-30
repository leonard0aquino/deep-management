import { describe, expect, it } from "vitest";
import { analyzeImport, buildErrorReport, parseCsv, prepareImportPayload } from "@/services/structured-import";

const references = {
  clients: [{ id: "c1", name: "Acme" }],
  products: [{ id: "p1", name: "Portal", slug: "portal" }],
  managers: [{ id: "m1", name: "Ana", email: "ana@aisphere.com.br" }],
  contacts: [{ id: "ct1", client_id: "c1", name: "João", email: "joao@acme.com" }],
};

describe("structured import", () => {
  it("interpreta BOM, ponto e vírgula, CRLF e aspas", () => {
    const parsed = parseCsv('\uFEFFname;segment\r\n"ACME; Brasil";Enterprise\r\n');
    expect(parsed.headers).toEqual(["name", "segment"]);
    expect(parsed.rows[0]).toEqual({ row: 2, values: { name: "ACME; Brasil", segment: "Enterprise" } });
  });

  it("preserva quebra de linha dentro de campo entre aspas", () => {
    const parsed = parseCsv('name,segment\n"Acme\nBrasil",Enterprise');
    expect(parsed.rows[0].values.name).toBe("Acme\nBrasil");
  });

  it("detecta cliente duplicado sem diferenciar caixa ou acentos", () => {
    const result = analyzeImport("clients", "name,segment\nÁCME,Enterprise", references);
    expect(result.duplicateRows).toEqual([2]);
    expect(result.validRows).toHaveLength(0);
  });

  it("valida referências e campos de uma interação", () => {
    const result = analyzeImport(
      "interactions",
      "client_name,product_name,manager_email,contact_email,interaction_type,topic,relevance,occurred_at\nAcme,Portal,ana@aisphere.com.br,joao@acme.com,meeting,QBR,5,2026-07-28",
      references,
    );
    expect(result.issues).toEqual([]);
    expect(result.validRows).toHaveLength(1);
  });

  it("informa referências inexistentes e valores inválidos", () => {
    const result = analyzeImport(
      "interactions",
      "client_name,product_name,interaction_type,topic,relevance,occurred_at\nInexistente,Portal,reuniao,QBR,8,28/07/2026",
      references,
    );
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["unresolved", "invalid"]));
    expect(result.invalidRows).toEqual([2]);
  });

  it("rejeita datas inexistentes no calendário", () => {
    const result = analyzeImport("clients", "name,contract_renewal_date\nNova,2026-02-31", references);
    expect(result.issues).toContainEqual(expect.objectContaining({ field: "contract_renewal_date", code: "invalid" }));
  });

  it("rejeita interação com data futura", () => {
    const result = analyzeImport(
      "interactions",
      "client_name,product_name,interaction_type,topic,relevance,occurred_at\nAcme,Portal,meeting,QBR,5,2999-07-28",
      references,
    );
    expect(result.issues).toContainEqual(expect.objectContaining({ field: "occurred_at", code: "invalid" }));
    expect(result.validRows).toHaveLength(0);
  });

  it("valida pessoa e contrato com referências resolvidas", () => {
    const person = analyzeImport("people", "client_name,name,email,influence\nAcme,Maria,maria@acme.com,alta", references);
    const contract = analyzeImport("contracts", "client_name,product_name,contract_value,renewal_date\nAcme,Portal,120000.50,2027-07-28", references);
    expect(person.validRows).toHaveLength(1);
    expect(contract.validRows).toHaveLength(1);
  });

  it("resolve o responsável opcional do contrato para o vínculo cliente e produto", () => {
    const analysis = analyzeImport(
      "contracts",
      "client_name,product_name,owner_email\nAcme,Portal,ana@aisphere.com.br",
      references,
    );
    expect(analysis.issues).toEqual([]);
    expect(prepareImportPayload("contracts", analysis.validRows, references)).toEqual([
      expect.objectContaining({ client_id: "c1", product_id: "p1", owner_manager_id: "m1" }),
    ]);
  });

  it("gera relatório CSV protegendo contra fórmula", () => {
    const report = buildErrorReport([{ row: 2, field: "name", code: "invalid", message: "=cmd()" }]);
    expect(report).toContain("'=cmd()");
  });
});
