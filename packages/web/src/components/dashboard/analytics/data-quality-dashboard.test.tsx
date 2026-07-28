import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataQualityDashboard } from "@/components/dashboard/analytics/data-quality-dashboard";
import type { Client } from "@/lib/types/database";
import type { DataQualityPortfolio } from "@/services/data-quality";

const client = { id: "c1", name: "Acme", active: true } as Client;
const summary: DataQualityPortfolio = {
  averageScore: 88,
  activeClients: 1,
  completeClients: 0,
  issueCounts: [{ key: "owner", label: "Sem responsável", description: "Defina o responsável.", count: 1 }],
  reports: [{ client, score: 88, passedChecks: 7, totalChecks: 8, issues: [{ key: "owner", label: "Sem responsável", description: "Defina o responsável." }] }],
};

describe("DataQualityDashboard", () => {
  it("mostra resumo e indicador acionável por cliente", () => {
    render(<DataQualityDashboard summary={summary} />);
    expect(screen.getByRole("heading", { name: "Qualidade dos dados" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Indicador de qualidade dos dados por cliente" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Acme" }).getAttribute("href")).toBe("/accounts/c1");
    expect(screen.getByText("88/100")).toBeTruthy();
    expect(screen.getAllByText("Sem responsável")).toHaveLength(2);
  });

  it("expõe o estado vazio da carteira", () => {
    render(<DataQualityDashboard summary={{ ...summary, activeClients: 0, completeClients: 0, reports: [] }} />);
    expect(screen.getByText("Nenhum cliente ativo na carteira.")).toBeTruthy();
  });
});
