import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CommercialDashboard } from "@/components/dashboard/commercial/commercial-dashboard";
import type { Client, CommercialOpportunity, DeepManager, Product } from "@/lib/types/database";

const clients: Client[] = [
  { id: "c1", name: "Acme", segment: null, logo_url: null, contract_value: null, contract_renewal_date: null, owner_manager_id: null, client_kind: "prospect", active: true, custom_fields: {}, created_at: "2026-01-01" },
  { id: "c2", name: "Beta", segment: null, logo_url: null, contract_value: null, contract_renewal_date: null, owner_manager_id: null, client_kind: "customer", active: true, custom_fields: {}, created_at: "2026-01-01" },
];
const products: Product[] = [{ id: "p1", name: "Legal", slug: "legal", color: null, active: true, created_at: "2026-01-01" }];
const managers: DeepManager[] = [{ id: "m1", name: "Marina", email: null, avatar_color: null, active: true, linked_user_id: "u1", created_at: "2026-01-01" }];
const opportunities: CommercialOpportunity[] = [{ id: "o1", client_id: "c1", contact_id: null, product_id: "p1", owner_manager_id: "m1", name: "Venda Legal", stage: "proposal", amount: 10000, probability: 50, next_step: "Retornar proposta", next_step_at: "2026-08-05T13:00:00Z", closed_at: null, loss_reason: null, created_by: "u1", updated_by: "u1", created_at: "2026-08-01T12:00:00Z", updated_at: "2026-08-03T12:00:00Z" }];

afterEach(cleanup);

describe("CommercialDashboard", () => {
  it("exibe indicadores honestos, funil e agenda nativa", () => {
    render(<CommercialDashboard opportunities={opportunities} events={[]} interactions={[]} clients={clients} products={products} managers={managers} referenceAt="2026-08-04T15:00:00Z" />);
    expect(screen.getByText("Dias sem nova reunião")).toBeTruthy();
    expect(screen.getByText("Venda Legal")).toBeTruthy();
    expect(screen.getByText("Retornar proposta")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Modo TV/i }).getAttribute("href")).toBe("/commercial/tv");
  });

  it("aplica o filtro de empresa a todos os blocos", () => {
    render(<CommercialDashboard opportunities={opportunities} events={[]} interactions={[]} clients={clients} products={products} managers={managers} referenceAt="2026-08-04T15:00:00Z" />);
    fireEvent.change(screen.getByLabelText("Empresa Comercial"), { target: { value: "c2" } });
    expect(screen.queryByText("Venda Legal")).toBeNull();
    expect(screen.getByText("Nenhum próximo passo agendado para os filtros.")).toBeTruthy();
  });
});
