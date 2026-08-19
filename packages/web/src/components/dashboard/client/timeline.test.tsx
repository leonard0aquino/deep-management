import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    business_area: "customer_success",
    counts_for_health: true,
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

    expect(screen.getByText("Histórico de interações com este cliente · clique para editar")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.tagName === "P" && (element.textContent?.includes("Ana Silva · Consórcio") ?? false))).toBeTruthy();
    expect(screen.queryByText((_, element) => element?.tagName === "P" && (element.textContent?.includes("Ana Silva · Prevent Senior") ?? false))).toBeNull();
  });

  it("mantém a data civil da interação ao formatar no fuso de São Paulo", () => {
    const originalTimeZone = process.env.TZ;
    process.env.TZ = "America/Sao_Paulo";
    try {
      render(<Timeline interactions={[interaction({ occurred_at: "2026-08-19" })]} data={data} />);

      expect(screen.getByText((_, element) =>
        element?.tagName === "P" && (element.textContent?.startsWith("19 de ago. de 2026") ?? false),
      )).toBeTruthy();
    } finally {
      if (originalTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimeZone;
    }
  });

  it("identifica o cliente no histórico do produto", () => {
    render(<Timeline interactions={[interaction()]} data={data} scope="product" />);

    expect(screen.getByText("Histórico de interações deste produto · clique para editar")).toBeTruthy();
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

  it("mostra inicialmente todas as interações dos dois dias mais recentes", () => {
    render(<Timeline interactions={[
      interaction({ id: "old", topic: "Dia 1", occurred_at: "2026-08-01" }),
      interaction({ id: "latest-b", topic: "Dia 3 B", occurred_at: "2026-08-03", created_at: "2026-08-03T11:00:00Z" }),
      interaction({ id: "middle", topic: "Dia 2", occurred_at: "2026-08-02" }),
      interaction({ id: "latest-a", topic: "Dia 3 A", occurred_at: "2026-08-03", created_at: "2026-08-03T12:00:00Z" }),
    ]} data={data} />);

    expect(screen.getByText("Dia 3 A")).toBeTruthy();
    expect(screen.getByText("Dia 3 B")).toBeTruthy();
    expect(screen.getByText("Dia 2")).toBeTruthy();
    expect(screen.queryByText("Dia 1")).toBeNull();
    expect(screen.getByRole("button", { name: "Ver mais" })).toBeTruthy();
  });

  it("revela mais dois dias por clique e remove o botão ao concluir", () => {
    render(<Timeline interactions={[
      interaction({ id: "d5", topic: "Dia 5", occurred_at: "2026-08-05" }),
      interaction({ id: "d4", topic: "Dia 4", occurred_at: "2026-08-04" }),
      interaction({ id: "d3", topic: "Dia 3", occurred_at: "2026-08-03" }),
      interaction({ id: "d2", topic: "Dia 2", occurred_at: "2026-08-02" }),
      interaction({ id: "d1", topic: "Dia 1", occurred_at: "2026-08-01" }),
    ]} data={data} />);

    fireEvent.click(screen.getByRole("button", { name: "Ver mais" }));
    expect(screen.getByText("Dia 3")).toBeTruthy();
    expect(screen.getByText("Dia 2")).toBeTruthy();
    expect(screen.queryByText("Dia 1")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Ver mais" }));
    expect(screen.getByText("Dia 1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ver mais" })).toBeNull();
  });
});
