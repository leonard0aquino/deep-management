import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InternalGoalsDashboard } from "@/components/dashboard/goals/internal-goals-dashboard";
import { INTERNAL_GOAL_DEFINITIONS, type InternalGoalResult } from "@/services/internal-goals";

const refresh = vi.fn();
const eq = vi.fn().mockResolvedValue({ error: null });
const update = vi.fn(() => ({ eq }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from: () => ({ update }) }) }));
vi.mock("@/lib/actions/revalidate-dashboard", () => ({ revalidateDashboardCache: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const results: InternalGoalResult[] = INTERNAL_GOAL_DEFINITIONS.map((definition, index) => ({
  ...definition,
  actual: index === 3 ? null : 80,
  target: definition.unit === "hours" ? 24 : 90,
  baseline: null,
  progress: index === 3 ? null : 88.9,
  status: index === 3 ? "no_data" : index === 4 ? "achieved" : "attention",
}));

describe("InternalGoalsDashboard", () => {
  it("apresenta as seis metas, situações, janelas e modo somente leitura", () => {
    render(<InternalGoalsDashboard initialResults={results} currentRiskClients={2} canEdit={false} generatedAt="28/07/2026, 15:00" />);

    for (const item of INTERNAL_GOAL_DEFINITIONS) expect(screen.getByRole("heading", { name: item.label })).toBeTruthy();
    expect(screen.getAllByText("Em atenção")).toHaveLength(4);
    expect(screen.getByText("Atingida")).toBeTruthy();
    expect(screen.getByText("Sem dados")).toBeTruthy();
    expect(screen.getByText(/Somente administradores e gerentes/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Salvar metas" })).toBeNull();
  });

  it("valida e persiste os seis alvos para a liderança", async () => {
    render(<InternalGoalsDashboard initialResults={results} currentRiskClients={2} canEdit generatedAt="28/07/2026, 15:00" />);

    fireEvent.change(screen.getByLabelText("Alvo de Carteira em dia"), { target: { value: "101" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar metas" }));
    expect((await screen.findByRole("alert")).textContent).toContain("percentuais devem ficar entre 0 e 100");
    expect(update).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Alvo de Carteira em dia"), { target: { value: "85" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar metas" }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(6));
    expect((await screen.findByRole("status")).textContent).toContain("Metas atualizadas com sucesso");
    expect(refresh).toHaveBeenCalled();
  });
});
