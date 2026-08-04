import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientCommercialPlanSection } from "@/components/dashboard/client/client-commercial-plan";
import type { Client, ClientCommercialPlan, DeepManager } from "@/lib/types/database";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const insert = vi.fn();
const update = vi.fn();
const from = vi.fn((table: string) => ({
  insert: (payload: Record<string, unknown>) => insert(table, payload),
  update: (payload: Record<string, unknown>) => ({ eq: (column: string, value: unknown) => update(table, payload, column, value) }),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));

const client: Client = { id: "c1", name: "Acme", segment: null, logo_url: null, contract_value: 100000, contract_renewal_date: "2026-12-10", owner_manager_id: "m1", client_kind: "customer", active: true, custom_fields: {}, created_at: "2026-01-01" };
const managers: DeepManager[] = [{ id: "m1", name: "Marina", email: null, avatar_color: null, active: true, linked_user_id: "u1", created_at: "2026-01-01" }];
const plan: ClientCommercialPlan = { id: "p1", client_id: "c1", owner_manager_id: "m1", status: "em_negociacao", probability: 60, expected_renewal_value: 100000, expansion_value: 20000, next_step: "Enviar proposta", next_step_due_date: "2026-08-10", notes: null, created_by: "u1", updated_by: "u1", created_at: "2026-07-01", updated_at: "2026-07-01" };

function renderSection(overrides: Partial<ComponentProps<typeof ClientCommercialPlanSection>> = {}) {
  return render(<ClientCommercialPlanSection client={client} plan={null} managers={managers} canManage {...overrides} />);
}

describe("ClientCommercialPlanSection", () => {
  afterEach(cleanup);
  beforeEach(() => { refresh.mockClear(); insert.mockReset(); update.mockReset(); insert.mockResolvedValue({ error: null }); update.mockResolvedValue({ error: null }); });

  it("orienta o estado vazio e bloqueia escrita para analistas", () => {
    renderSection({ canManage: false });
    expect(screen.getByText(/Nenhum plano comercial definido/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Criar plano comercial" })).toBeNull();
  });

  it("explica o cálculo ponderado e comunica o status por texto", () => {
    renderSection({ plan });
    expect(screen.getByText("Em negociação")).toBeTruthy();
    expect(screen.getByText("60% de probabilidade")).toBeTruthy();
    expect(screen.getByText(/Cálculo:/)).toBeTruthy();
    expect(screen.getByText(/72\.000/)).toBeTruthy();
  });

  it("cria o plano e atualiza somente após confirmação", async () => {
    renderSection();
    fireEvent.click(screen.getByRole("button", { name: "Criar plano comercial" }));
    fireEvent.change(screen.getByLabelText("Prazo do próximo passo"), { target: { value: "2026-08-10" } });
    fireEvent.change(screen.getByLabelText("Próximo passo"), { target: { value: "Enviar proposta" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar plano comercial" }));
    await waitFor(() => expect(insert).toHaveBeenCalledWith("client_commercial_plans", expect.objectContaining({ client_id: "c1", expected_renewal_value: 100000, probability: 50 })));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("mantém o modal aberto e não atualiza após erro", async () => {
    insert.mockResolvedValue({ error: { message: "denied" } });
    renderSection();
    fireEvent.click(screen.getByRole("button", { name: "Criar plano comercial" }));
    fireEvent.change(screen.getByLabelText("Prazo do próximo passo"), { target: { value: "2026-08-10" } });
    fireEvent.change(screen.getByLabelText("Próximo passo"), { target: { value: "Enviar proposta" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar plano comercial" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Não foi possível salvar"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("edita o plano existente", async () => {
    renderSection({ plan });
    fireEvent.click(screen.getByRole("button", { name: "Editar plano comercial" }));
    fireEvent.change(screen.getByLabelText("Probabilidade (%)"), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar plano comercial" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith("client_commercial_plans", expect.objectContaining({ probability: 80 }), "id", "p1"));
  });

  it("apresenta planos renovados como receita realizada", () => {
    renderSection({ plan: { ...plan, status: "renovado" } });
    expect(screen.getByText("Receita realizada")).toBeTruthy();
    expect(screen.getByText(/removidos do pipeline aberto/)).toBeTruthy();
    expect(screen.getByText(/120\.000/)).toBeTruthy();
  });
});
