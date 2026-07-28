import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExecutiveReportView } from "@/components/dashboard/reports/executive-report";
import type { Client } from "@/lib/types/database";
import type { ExecutiveReport } from "@/services/executive-report";

const client = { id: "c1", name: "Acme", contract_value: 1000, contract_renewal_date: "2026-08-20" } as Client;
const report: ExecutiveReport = {
  period: { days: 7, start: "2026-07-22", end: "2026-07-28" },
  generatedAt: "2026-07-28T12:00:00Z",
  summary: { activeClients: 1, healthScore: 72, dataQualityScore: 63, activeContractValue: 1000, clientsWithoutNextAction: 1 },
  changes: { interactions: 1, actionUpdates: 0, portfolioUpdates: 0, commercialUpdates: 0, total: 1, timeline: [{ id: "change-1", occurredAt: "2026-07-28", kind: "interaction", label: "Interação registrada", detail: "Revisão", clientId: "c1", clientName: "Acme" }] },
  risks: [{ id: "r1", clientId: "c1", clientName: "Acme", title: "Adoção crítica", impact: "alto", probability: "alta", priority: "Alta", ownerName: "Ana", targetDate: "2026-07-25", overdue: true }],
  opportunities: [],
  renewals: [{ client, plan: null, daysRemaining: 23 }],
  overdueActions: [],
  decisions: [{ id: "d1", kind: "risk", clientId: "c1", clientName: "Acme", title: "Direcionar mitigação", rationale: "Risco de alta prioridade." }],
};

afterEach(cleanup);

describe("ExecutiveReportView", () => {
  it("expõe as sete seções, o período e links acionáveis", () => {
    render(<ExecutiveReportView report={report} />);
    for (const heading of ["Resumo da carteira", "Principais mudanças", "Riscos", "Oportunidades", "Renovações", "Ações atrasadas", "Decisões necessárias da liderança"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
    }
    expect(screen.getByRole("link", { name: "7 dias" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getAllByRole("link", { name: "Acme" }).every((link) => link.getAttribute("href") === "/accounts/c1")).toBe(true);
    expect(screen.getByRole("button", { name: "Imprimir / salvar PDF" })).toBeTruthy();
  });

  it("mantém estados vazios explícitos", () => {
    render(<ExecutiveReportView report={{ ...report, changes: { interactions: 0, actionUpdates: 0, portfolioUpdates: 0, commercialUpdates: 0, total: 0, timeline: [] }, risks: [], renewals: [], decisions: [] }} />);
    expect(screen.getByText("Nenhuma mudança registrada no período.")).toBeTruthy();
    expect(screen.getByText("Nenhum risco aberto na carteira.")).toBeTruthy();
    expect(screen.getByText("Nenhuma oportunidade aberta na carteira.")).toBeTruthy();
    expect(screen.getByText("Nenhuma renovação prevista para os próximos 180 dias.")).toBeTruthy();
    expect(screen.getByText("Nenhuma ação atrasada na carteira.")).toBeTruthy();
    expect(screen.getByText("Nenhuma decisão de liderança identificada neste momento.")).toBeTruthy();
  });
});
