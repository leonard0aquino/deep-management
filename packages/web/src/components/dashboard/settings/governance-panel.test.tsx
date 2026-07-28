import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GovernancePanel } from "@/components/dashboard/settings/governance-panel";

afterEach(cleanup);

describe("GovernancePanel", () => {
  it("apresenta regras, indicadores e acesso à correção", () => {
    render(<GovernancePanel clients={[{
      id: "c1", name: "Acme", segment: null, logo_url: null, contract_value: null,
      contract_renewal_date: null, owner_manager_id: null, active: true, custom_fields: {},
      created_at: "2026-01-01",
    }]} interactions={[]} stakeholders={[]} successPlans={[]} tasks={[]} commercialPlans={[]} referenceDate="2026-07-28" staleAfterDays={90} />);

    expect(screen.getByRole("heading", { name: "Governança da carteira" })).toBeTruthy();
    expect(screen.getByText("Interações relevantes devem ser registradas em até 24 horas.")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Pendências de governança" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver qualidade detalhada" }).getAttribute("href")).toBe("/analytics#data-quality");
  });
});
