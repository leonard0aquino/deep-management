import { describe, expect, it, vi } from "vitest";
import type { ClientContact, InteractionView } from "@/lib/types/database";
import { computeScoreTrend } from "@/services/health-score";

function interaction(date: string): InteractionView {
  return { id: "i1", client_id: "c1", client_name: "Cliente", product_id: "p1", product_name: "Produto", product_color: null, manager_id: null, manager_name: null, contact_id: "s1", contact_name: "Stakeholder", interaction_type: "meeting", topic: "Revisão", notes: "Notas", decisions: null, customer_sentiment: null, risks: null, opportunities: null, next_step: null, next_step_owner: null, next_step_due_date: null, additional_participants: [], confidential: false, business_area: "customer_success", counts_for_health: true, relevance: 5, occurred_at: date, links: [], created_by: "u1", created_at: `${date}T12:00:00Z`, updated_at: `${date}T12:00:00Z`, days_since_contact: 0, status: "recente" };
}

const contact: ClientContact = { id: "s1", client_id: "c1", name: "Stakeholder", role: null, email: null, phone: null, influence: "alta", relationship_role: "patrocinador", owner_manager_id: null, reports_to_contact_id: null, photo_url: null, created_at: "2026-01-01" };

describe("health score trend", () => {
  it("limita o score histórico ao intervalo de 0 a 100", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T12:00:00Z"));
    const trend = computeScoreTrend([interaction("2026-07-28")], [contact], 1, {
      weight_recency: 1,
      weight_frequency: 1,
      weight_relevance: 1,
      weight_participation: 1,
      weight_diversity: 1,
    });
    expect(trend[0]?.score).toBe(100);
    vi.useRealTimers();
  });

  it("não antecipa interações futuras no ponto atual", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T12:00:00Z"));
    const trend = computeScoreTrend(
      [interaction("2026-04-29"), interaction("2029-07-28")],
      [contact],
      1,
      {
        weight_recency: 1,
        weight_frequency: 0,
        weight_relevance: 0,
        weight_participation: 0,
        weight_diversity: 0,
      },
    );
    expect(trend[0]?.score).toBe(0);
    vi.useRealTimers();
  });
});
