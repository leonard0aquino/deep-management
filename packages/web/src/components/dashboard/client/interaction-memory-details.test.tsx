import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InteractionMemoryDetails } from "@/components/dashboard/client/interaction-memory-details";
import type { InteractionView } from "@/lib/types/database";

function interaction(overrides: Partial<InteractionView> = {}): InteractionView {
  return {
    id: "i1", client_id: "c1", product_id: "p1", manager_id: null, contact_id: null,
    interaction_type: "meeting", topic: "Reunião executiva", notes: null,
    decisions: null, customer_sentiment: null, risks: null, opportunities: null,
    next_step: null, next_step_owner: null, next_step_due_date: null,
    additional_participants: [], confidential: false, business_area: "customer_success", counts_for_health: true, relevance: 4,
    occurred_at: "2026-07-27", links: [], created_by: null, created_at: "2026-07-27",
    updated_at: "2026-07-27", client_name: "Acme", product_name: "Suite",
    product_color: null, manager_name: null, contact_name: null, days_since_contact: 0,
    status: "recente",
    ...overrides,
  };
}

describe("InteractionMemoryDetails", () => {
  it("não adiciona ruído quando a interação não possui memória estruturada", () => {
    const { container } = render(<InteractionMemoryDetails interaction={interaction()} />);
    expect(container.innerHTML).toBe("");
  });

  it("apresenta os sinais, decisões e próximo passo preenchidos", () => {
    render(
      <InteractionMemoryDetails
        interaction={interaction({
          notes: "Cliente quer acelerar o rollout.",
          decisions: "Piloto aprovado.",
          customer_sentiment: "positive",
          risks: "Prazo curto.",
          opportunities: "Expansão para outra unidade.",
          next_step: "Enviar plano revisado.",
          next_step_owner: "Marina",
          next_step_due_date: "2026-08-01",
          additional_participants: ["Ana", "Bruno"],
          confidential: true,
        })}
      />,
    );

    expect(screen.getByText("Cliente quer acelerar o rollout.")).toBeTruthy();
    expect(screen.getByText("Piloto aprovado.")).toBeTruthy();
    expect(screen.getByText("Sentimento: Positivo")).toBeTruthy();
    expect(screen.getByText("Prazo curto.")).toBeTruthy();
    expect(screen.getByText("Expansão para outra unidade.")).toBeTruthy();
    expect(screen.getByText("Enviar plano revisado.")).toBeTruthy();
    expect(screen.getByText("Responsável: Marina · Prazo: 01 de ago. de 2026")).toBeTruthy();
    expect(screen.getByText("Ana, Bruno")).toBeTruthy();
    expect(screen.getByText("Confidencial")).toBeTruthy();
  });
});
