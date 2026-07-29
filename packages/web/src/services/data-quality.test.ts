import { describe, expect, it } from "vitest";
import type { ActionTask, Client, ClientCommercialPlan, ClientProduct, ClientSuccessPlan, InteractionView, StakeholderHealth } from "@/lib/types/database";
import { buildClientDataQuality, buildDataQualityPortfolio } from "@/services/data-quality";

const client: Client = { id: "c1", name: "Acme", segment: null, logo_url: null, contract_value: 1000, contract_renewal_date: "2026-12-01", owner_manager_id: "m1", active: true, custom_fields: {}, created_at: "2026-07-01" };
const interaction: InteractionView = { id: "i1", client_id: "c1", client_name: "Acme", product_id: "p1", product_name: "Produto", product_color: null, manager_id: "m1", manager_name: "Ana", contact_id: null, contact_name: null, interaction_type: "meeting", topic: "Revisão", notes: "Notas", decisions: "Aprovado", customer_sentiment: null, risks: null, opportunities: null, next_step: "Enviar proposta", next_step_owner: "Ana", next_step_due_date: "2026-08-01", additional_participants: [], confidential: false, relevance: 4, occurred_at: "2026-07-28", links: [], created_by: "u1", created_at: "2026-07-28T12:00:00Z", updated_at: "2026-07-28T12:00:00Z", days_since_contact: 0, status: "recente" };
const stakeholder: StakeholderHealth = { contact_id: "s1", client_id: "c1", client_name: "Acme", name: "Bia", role: null, email: null, phone: null, influence: "alta", relationship_role: "decisor", owner_manager_id: "m1", owner_manager_name: "Ana", photo_url: null, reports_to_contact_id: null, last_contact: "2026-07-28", interaction_count: 1, last_customer_sentiment: "positive", sentiment_recorded_at: "2026-07-28", days_since_contact: 0, status: "recente", score: 90, risk: "baixo" };
const successPlan: ClientSuccessPlan = { id: "sp1", client_id: "c1", objective: "Aumentar adoção", expected_outcome: "80%", owner_manager_id: "m1", target_date: "2026-12-01", status: "ativo", created_by: "u1", updated_by: "u1", created_at: "2026-07-01", updated_at: "2026-07-28" };
const task: ActionTask = { id: "t1", action_key: "t1", client_id: "c1", client_name: "Acme", product_id: "p1", product_name: "Produto", priority: "media", reason: "Acompanhar", status: "pending", assigned_to: "u1", due_date: "2026-08-01", justification: null, result: null, created_by: "u1", updated_by: "u1", created_at: "2026-07-28", updated_at: "2026-07-28" };
const commercialPlan: ClientCommercialPlan = { id: "cp1", client_id: "c1", owner_manager_id: "m1", status: "em_preparacao", probability: 50, expected_renewal_value: 1000, expansion_value: 0, next_step: "Negociar", next_step_due_date: "2026-08-01", notes: null, created_by: "u1", updated_by: "u1", created_at: "2026-07-01", updated_at: "2026-07-28" };
const clientProduct: ClientProduct = { id: "link1", client_id: "c1", product_id: "p1", owner_manager_id: "m1", contract_value: 1000, renewal_date: "2026-12-01", active: true, created_at: "2026-07-01", updated_at: "2026-07-28" };

const completeInput = { client, interactions: [interaction], stakeholders: [stakeholder], successPlans: [successPlan], tasks: [task], commercialPlans: [commercialPlan], clientProducts: [clientProduct], referenceDate: "2026-07-28", staleAfterDays: 90 };

describe("qualidade dos dados", () => {
  it("atribui 100 pontos quando as oito verificações são aprovadas", () => {
    const report = buildClientDataQuality(completeInput);
    expect(report).toMatchObject({ score: 100, passedChecks: 8, totalChecks: 8, issues: [] });
  });

  it("identifica as oito pendências e atribui zero pontos", () => {
    const report = buildClientDataQuality({ ...completeInput, client: { ...client, owner_manager_id: null, contract_value: 0, contract_renewal_date: null, created_at: "2025-01-01" }, interactions: [{ ...interaction, notes: null, decisions: null, next_step: null, next_step_due_date: null, occurred_at: "2025-01-01", updated_at: "2025-01-01" }], stakeholders: [], successPlans: [], tasks: [], commercialPlans: [], clientProducts: [{ ...clientProduct, owner_manager_id: null }] });
    expect(report.score).toBe(0);
    expect(report.issues.map((item) => item.key)).toEqual(["owner", "recent_interaction", "key_stakeholder", "next_step", "commercial_data", "objective", "stale_data", "incomplete_interaction"]);
  });

  it("considera exatamente o limite recente e aceita tarefa ativa como próximo passo", () => {
    const report = buildClientDataQuality({ ...completeInput, interactions: [{ ...interaction, occurred_at: "2026-04-29", updated_at: "2026-04-29", next_step: null, next_step_due_date: null }], commercialPlans: [], successPlans: [{ ...successPlan, updated_at: "2026-04-29" }] });
    expect(report.issues.some((item) => item.key === "recent_interaction")).toBe(false);
    expect(report.issues.some((item) => item.key === "next_step")).toBe(false);
    expect(report.issues.some((item) => item.key === "stale_data")).toBe(false);
  });

  it("aceita próximo passo futuro da interação sem tarefa ativa", () => {
    const report = buildClientDataQuality({ ...completeInput, tasks: [] });
    expect(report.issues.some((item) => item.key === "next_step")).toBe(false);
  });

  it("ordena a carteira pela pior nota, ignora inativos e preserva vazio regular", () => {
    const portfolio = buildDataQualityPortfolio({ ...completeInput, clients: [{ ...client, id: "c2", name: "Beta", owner_manager_id: null }, client, { ...client, id: "c3", active: false }] });
    expect(portfolio.reports.map((item) => item.client.id)).toEqual(["c2", "c1"]);
    expect(portfolio.issueCounts.find((item) => item.key === "owner")?.count).toBe(1);
    expect(buildDataQualityPortfolio({ ...completeInput, clients: [] })).toMatchObject({ averageScore: 100, activeClients: 0, completeClients: 0, reports: [] });
  });
});
