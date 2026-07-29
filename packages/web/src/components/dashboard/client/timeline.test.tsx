import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Timeline } from "@/components/dashboard/client/timeline";
import type { DashboardData } from "@/lib/data";
import type { InteractionView } from "@/lib/types/database";

vi.mock("@/components/dashboard/registros/interaction-form-dialog", () => ({
  InteractionFormDialog: () => null,
}));

afterEach(cleanup);

const data = {
  clients: [],
  products: [],
  managers: [],
  contacts: [],
  clientProducts: [],
} as unknown as DashboardData;

function interaction(overrides: Partial<InteractionView> = {}): InteractionView {
  return {
    id: "i1",
    client_id: "c1",
    product_id: "p1",
    manager_id: "m1",
    contact_id: null,
    interaction_type: "meeting",
    topic: "Reunião executiva",
    notes: null,
    decisions: null,
    customer_sentiment: null,
    risks: null,
    opportunities: null,
    next_step: null,
    next_step_owner: null,
    next_step_due_date: null,
    additional_participants: [],
    confidential: false,
    relevance: 4,
    occurred_at: "2026-07-29T12:00:00.000Z",
    links: [],
    created_by: null,
    created_at: "2026-07-29T12:00:00.000Z",
    updated_at: "2026-07-29T12:00:00.000Z",
    client_name: "Prevent Senior",
    product_name: "Consórcio",
    product_color: null,
    manager_name: "Ana Silva",
    contact_name: null,
    days_since_contact: 0,
    status: "recente",
    ...overrides,
  };
}

describe("Timeline", () => {
  it("identifica o produto no histórico do cliente", () => {
    render(<Timeline interactions={[interaction()]} data={data} />);

    expect(screen.getByText("Histórico completo das interações com este cliente · clique para editar")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.tagName === "P" && (element.textContent?.includes("Ana Silva · Consórcio") ?? false))).toBeTruthy();
    expect(screen.queryByText((_, element) => element?.tagName === "P" && (element.textContent?.includes("Ana Silva · Prevent Senior") ?? false))).toBeNull();
  });

  it("identifica o cliente no histórico do produto", () => {
    render(<Timeline interactions={[interaction()]} data={data} scope="product" />);

    expect(screen.getByText("Histórico completo das interações deste produto · clique para editar")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.tagName === "P" && (element.textContent?.includes("Ana Silva · Prevent Senior") ?? false))).toBeTruthy();
    expect(screen.queryByText((_, element) => element?.tagName === "P" && (element.textContent?.includes("Ana Silva · Consórcio") ?? false))).toBeNull();
  });

  it.each([
    ["client" as const, "Nenhuma interação registrada com este cliente ainda."],
    ["product" as const, "Nenhuma interação registrada com este produto ainda."],
  ])("usa o estado vazio do contexto %s", (scope, label) => {
    render(<Timeline interactions={[]} data={data} scope={scope} />);

    expect(screen.getByText(label)).toBeTruthy();
  });
});
