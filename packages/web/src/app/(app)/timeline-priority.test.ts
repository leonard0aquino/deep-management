import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("prioridade da Timeline nas visões de detalhe", () => {
  it("mantém somente as seções essenciais do cliente na ordem esperada", () => {
    const page = source("src/app/(app)/accounts/[id]/page.tsx");
    const header = page.indexOf("<ClientHeader");
    const timeline = page.indexOf("<Timeline interactions={clientInteractions}");
    const dataQuality = page.indexOf("<ClientDataQuality");
    const briefing = page.indexOf("<ClientBriefing");
    const products = page.indexOf("<ClientProducts");
    const stakeholders = page.indexOf("<ClientStakeholders");

    expect(header).toBeGreaterThan(-1);
    expect(timeline).toBeGreaterThan(header);
    expect(dataQuality).toBeGreaterThan(timeline);
    expect(briefing).toBeGreaterThan(dataQuality);
    expect(products).toBeGreaterThan(briefing);
    expect(stakeholders).toBeGreaterThan(products);

    expect(page).not.toContain("ClientSuccessPlanSection");
    expect(page).not.toContain("ClientRiskOpportunitiesSection");
    expect(page).not.toContain("ClientCommercialPlanSection");
    expect(page).not.toContain("client_risk_opportunities");
    expect(page).not.toContain("client_success_milestones");
    expect(page).not.toContain("ClientCadences");
    expect(page).not.toContain("ClientPending");
    expect(page).not.toContain("ClientFiles");
    expect(page).not.toContain("clientPendingActions");
    expect(page).not.toContain("clientNextSteps");
  });

  it("posiciona a Timeline filtrada do produto logo após o cabeçalho", () => {
    const page = source("src/app/(app)/products/[id]/page.tsx");
    const header = page.indexOf("<ProductHeader");
    const timeline = page.indexOf("<Timeline interactions={productInteractions}");
    const nextSection = page.indexOf("<ProductClients");

    expect(header).toBeGreaterThan(-1);
    expect(timeline).toBeGreaterThan(header);
    expect(timeline).toBeLessThan(nextSection);
    expect(page).not.toContain("ProductRevenue");
    expect(page).not.toContain("protectedRevenue");
    expect(page).not.toContain("potentialRevenue");
  });
});
