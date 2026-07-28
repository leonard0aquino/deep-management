import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ManagementDashboard } from "@/components/dashboard/analytics/management-dashboard";
import type { ManagementDashboardSummary } from "@/services/management-dashboard";

const summary: ManagementDashboardSummary = {
  clientsByOwner: [{ name: "Ana", count: 3 }, { name: "Sem responsável", count: 1 }],
  interactionsByOwner: [{ name: "Ana", count: 8 }],
  actions: { open: 4, completed: 7, overdue: 2, averageResolutionDays: 3.5 },
  clientsWithoutNextAction: [],
  stakeholderCoverage: {
    percent: 75,
    concentratedClients: 1,
    byRole: [
      { role: "patrocinador", clients: 3, percent: 75 },
      { role: "decisor", clients: 3, percent: 75 },
      { role: "influenciador", clients: 3, percent: 75 },
      { role: "usuario_chave", clients: 3, percent: 75 },
    ],
  },
  revenueAtRisk: 125_000,
  alerts: { untreated: 2, overdue: 1 },
  monthlyEvolution: [{ key: "2026-07", label: "jul./26", interactions: 8, completedActions: 4 }],
};

describe("ManagementDashboard", () => {
  it("expõe indicadores gerenciais e definições textuais", () => {
    render(<ManagementDashboard summary={summary} />);
    expect(screen.getByRole("heading", { name: "Execução da carteira" })).toBeTruthy();
    expect(screen.getByText("Ações atrasadas")).toBeTruthy();
    expect(screen.getByText("3.5d")).toBeTruthy();
    expect(screen.getByText(/R\$\s*125\.000/)).toBeTruthy();
    expect(screen.getByText(/valor contratado ×/i)).toBeTruthy();
    expect(screen.getByText("Toda a carteira possui uma próxima ação definida.")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Evolução mensal de interações e ações concluídas" })).toBeTruthy();
  });
});
