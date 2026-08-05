import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommercialOpportunities } from "@/components/dashboard/commercial/commercial-opportunities";
import type { Client, CommercialOpportunity, DeepManager, Product } from "@/lib/types/database";

const refresh = vi.fn();
const insert = vi.fn();
const updateEq = vi.fn();
const update = vi.fn(() => ({ eq: updateEq }));
const from = vi.fn(() => ({ insert, update }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));

const clients: Client[] = [{ id: "c1", name: "Acme", segment: null, logo_url: null, contract_value: null, contract_renewal_date: null, owner_manager_id: "m1", client_kind: "prospect", active: true, custom_fields: {}, created_at: "2026-01-01" }];
const products: Product[] = [{ id: "p1", name: "Legal", slug: "legal", color: null, active: true, created_at: "2026-01-01" }];
const managers: DeepManager[] = [{ id: "m1", name: "Marina", email: null, avatar_color: null, active: true, linked_user_id: "u1", created_at: "2026-01-01" }];
const opportunities: CommercialOpportunity[] = [
  { id: "o1", client_id: "c1", contact_id: null, product_id: null, owner_manager_id: "m1", name: "Conta nova", stage: "prospecting", amount: 1000, probability: 10, next_step: "Agendar reunião", next_step_at: "2026-08-05T13:00:00Z", closed_at: null, loss_reason: null, created_by: "u1", updated_by: "u1", created_at: "2026-08-04T10:00:00Z", updated_at: "2026-08-04T10:00:00Z" },
  { id: "o2", client_id: "c1", contact_id: null, product_id: "p1", owner_manager_id: "m1", name: "Proposta Legal", stage: "proposal", amount: 5000, probability: 60, next_step: null, next_step_at: null, closed_at: null, loss_reason: null, created_by: "u1", updated_by: "u1", created_at: "2026-08-04T10:00:00Z", updated_at: "2026-08-04T10:00:00Z" },
];

describe("CommercialOpportunities", () => {
  beforeEach(() => {
    insert.mockReset();
    updateEq.mockReset();
    refresh.mockReset();
    insert.mockResolvedValue({ error: null });
    updateEq.mockResolvedValue({ error: null });
  });
  afterEach(cleanup);

  it("filtra a lista pela etapa selecionada", () => {
    render(<CommercialOpportunities opportunities={opportunities} events={[]} clients={clients} contacts={[]} products={products} managers={managers} users={[{ id: "u1", name: "Marina" }]} currentManager={managers[0]} currentUserName="Marina" />);
    fireEvent.change(screen.getByLabelText("Filtrar por etapa"), { target: { value: "proposal" } });
    expect(screen.getByText("Proposta Legal")).toBeTruthy();
    expect(screen.queryByText("Conta nova")).toBeNull();
  });

  it("abre a criação e persiste uma oportunidade estruturada", async () => {
    render(<CommercialOpportunities opportunities={[]} events={[]} clients={clients} contacts={[]} products={products} managers={managers} users={[{ id: "u1", name: "Marina" }]} currentManager={managers[0]} currentUserName="Marina" />);
    fireEvent.click(screen.getByRole("button", { name: /Nova oportunidade/i }));
    expect((screen.getByLabelText("Responsável AISphere") as HTMLInputElement).readOnly).toBe(true);
    expect(screen.getByDisplayValue("Marina")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nome da oportunidade"), { target: { value: "Venda Legal" } });
    fireEvent.change(screen.getByLabelText("Empresa"), { target: { value: "c1" } });
    fireEvent.change(screen.getByLabelText("Valor (R$)"), { target: { value: "12000" } });
    fireEvent.change(screen.getByLabelText("Probabilidade (%)"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar oportunidade" }));

    await waitFor(() => expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      client_id: "c1",
      contact_id: null,
      owner_manager_id: "m1",
      name: "Venda Legal",
      stage: "prospecting",
      amount: 12000,
      probability: 40,
    })));
    expect(refresh).toHaveBeenCalled();
  });

  it("exige motivo quando a etapa é Perdida", async () => {
    render(<CommercialOpportunities opportunities={opportunities} events={[]} clients={clients} contacts={[]} products={products} managers={managers} users={[{ id: "u1", name: "Marina" }]} currentManager={managers[0]} currentUserName="Marina" />);
    fireEvent.click(screen.getAllByRole("button", { name: /Editar/i })[0]);
    fireEvent.change(screen.getByLabelText("Etapa"), { target: { value: "lost" } });
    expect(await screen.findByLabelText("Motivo da perda")).toBeTruthy();
  });

  it("permite ao usuário Comercial criar oportunidade sem gestor DEEP vinculado", async () => {
    render(<CommercialOpportunities opportunities={[]} events={[]} clients={clients} contacts={[]} products={products} managers={[]} users={[{ id: "u1", name: "Leonardo Aquino" }]} currentManager={null} currentUserName="Leonardo Aquino" isCommercialUser />);
    fireEvent.click(screen.getByRole("button", { name: /Nova oportunidade/i }));

    expect(screen.getByDisplayValue("Leonardo Aquino")).toBeTruthy();
    expect((screen.getByLabelText("Responsável AISphere") as HTMLInputElement).readOnly).toBe(true);
    expect(screen.queryByText(/precisa estar vinculado/i)).toBeNull();
    fireEvent.change(screen.getByLabelText("Nome da oportunidade"), { target: { value: "Venda sem gestor" } });
    fireEvent.change(screen.getByLabelText("Empresa"), { target: { value: "c1" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar oportunidade" }));

    await waitFor(() => expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      owner_manager_id: null,
      name: "Venda sem gestor",
    })));
  });

  it("não estende a exceção sem gestor a usuários de outras áreas", () => {
    render(<CommercialOpportunities opportunities={[]} events={[]} clients={clients} contacts={[]} products={products} managers={[]} users={[]} currentManager={null} currentUserName="Admin AISphere" />);
    fireEvent.click(screen.getByRole("button", { name: /Nova oportunidade/i }));

    expect(screen.getByText(/exclusiva para usuários da área Comercial/i)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Salvar oportunidade" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
