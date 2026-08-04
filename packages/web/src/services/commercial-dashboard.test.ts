import { describe, expect, it } from "vitest";
import type { CommercialOpportunity, CommercialOpportunityStageEvent, InteractionView } from "@/lib/types/database";
import { buildCommercialDashboard } from "@/services/commercial-dashboard";

const opportunity: CommercialOpportunity = { id: "o1", client_id: "c1", product_id: "p1", owner_manager_id: "m1", name: "Venda", stage: "proposal", amount: 10000, probability: 50, next_step: "Retornar", next_step_at: "2026-08-03T12:00:00Z", closed_at: null, loss_reason: null, created_by: "u1", updated_by: "u1", created_at: "2026-07-20T12:00:00Z", updated_at: "2026-08-02T12:00:00Z" };
const event = (stage: CommercialOpportunityStageEvent["to_stage"], createdAt: string): CommercialOpportunityStageEvent => ({ id: `${stage}-${createdAt}`, opportunity_id: "o1", from_stage: null, to_stage: stage, actor_id: "u1", created_at: createdAt });
const interaction: InteractionView = { id: "i1", client_id: "c1", product_id: "p1", manager_id: "m1", contact_id: null, interaction_type: "meeting", topic: "Reunião", notes: null, decisions: null, customer_sentiment: null, risks: null, opportunities: null, next_step: null, next_step_owner: null, next_step_due_date: null, additional_participants: [], confidential: false, business_area: "commercial", counts_for_health: false, relevance: 4, occurred_at: "2026-08-01", links: [], created_by: "u1", created_at: "2026-08-01T12:00:00Z", updated_at: "2026-08-01T12:00:00Z", client_name: "Acme", product_name: "Legal", product_color: null, manager_name: "Marina", contact_name: null, days_since_contact: 3, status: "recente" };

describe("dashboard Comercial", () => {
  it("calcula KPIs somente de fontes comerciais estruturadas", () => {
    const summary = buildCommercialDashboard({ opportunities: [opportunity], events: [event("nda_poc", "2026-07-30T12:00:00Z"), event("proposal", "2026-08-02T12:00:00Z")], interactions: [interaction, { ...interaction, id: "i2", business_area: "customer_success", occurred_at: "2026-08-04" }], filters: { periodDays: 90 }, referenceAt: "2026-08-04T15:00:00Z" });
    expect(summary.kpis.map((item) => item.days)).toEqual([3, 5, 2, null]);
    expect(summary.interactions.map((item) => item.id)).toEqual(["i1"]);
  });

  it("mantém agenda nativa e identifica próximos passos atrasados", () => {
    const summary = buildCommercialDashboard({ opportunities: [opportunity], events: [], interactions: [], filters: { periodDays: null }, referenceAt: "2026-08-04T15:00:00Z" });
    expect(summary.agenda.map((item) => item.id)).toEqual(["o1"]);
    expect(summary.overdue.map((item) => item.id)).toEqual(["o1"]);
  });

  it("aplica filtros coerentes a funil e agenda", () => {
    const other = { ...opportunity, id: "o2", client_id: "c2", owner_manager_id: "m2", stage: "won" as const, next_step_at: null };
    const summary = buildCommercialDashboard({ opportunities: [opportunity, other], events: [], interactions: [], filters: { periodDays: null, ownerManagerId: "m1", stage: "proposal", clientId: "c1", productId: "p1" }, referenceAt: "2026-08-04T15:00:00Z" });
    expect(summary.opportunities.map((item) => item.id)).toEqual(["o1"]);
    expect(summary.funnel.find((item) => item.stage === "proposal")?.count).toBe(1);
  });
});
