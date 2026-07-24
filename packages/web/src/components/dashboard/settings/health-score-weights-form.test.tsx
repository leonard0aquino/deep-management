import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HealthScoreWeightsForm } from "@/components/dashboard/settings/health-score-weights-form";
import type { HealthScoreSettings } from "@/lib/types/database";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/actions/revalidate-dashboard", () => ({ revalidateDashboardCache: vi.fn() }));

const settings: HealthScoreSettings = {
  id: true, target_score: 85, weight_recency: 0.35, weight_frequency: 0.25,
  weight_relevance: 0.2, weight_participation: 0.1, weight_diversity: 0.1,
  updated_at: "2026-01-01",
};

describe("HealthScoreWeightsForm", () => {
  afterEach(() => cleanup());

  it("permite edição e salvar por padrão", () => {
    render(<HealthScoreWeightsForm settings={settings} />);
    expect(screen.getByRole("button", { name: "Salvar pesos" })).toBeTruthy();
    expect(screen.getByLabelText("Meta executiva")).not.toHaveProperty("disabled", true);
  });

  it("fica somente leitura quando readOnly", () => {
    render(<HealthScoreWeightsForm settings={settings} readOnly />);
    expect(screen.queryByRole("button", { name: "Salvar pesos" })).toBeNull();
    expect(screen.getByLabelText("Meta executiva")).toHaveProperty("disabled", true);
  });
});
