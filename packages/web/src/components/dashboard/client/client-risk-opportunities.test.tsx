import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientRiskOpportunitiesSection } from "@/components/dashboard/client/client-risk-opportunities";
import type { ClientRiskOpportunity, DeepManager } from "@/lib/types/database";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const insert = vi.fn();
const update = vi.fn();
const remove = vi.fn();
const from = vi.fn((table: string) => ({
  insert: (payload: Record<string, unknown>) => insert(table, payload),
  update: (payload: Record<string, unknown>) => ({ eq: (column: string, value: unknown) => update(table, payload, column, value) }),
  delete: () => ({ eq: (column: string, value: unknown) => remove(table, column, value) }),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));

const managers: DeepManager[] = [
  { id: "m1", name: "Marina", email: null, avatar_color: null, active: true, linked_user_id: "u1", created_at: "2026-01-01" },
];
const risk: ClientRiskOpportunity = {
  id: "r1", client_id: "c1", kind: "risco", title: "Adoção em queda", description: "Uso semanal abaixo do esperado",
  impact: "alto", probability: "alta", owner_manager_id: "m1", target_date: "2026-07-20", status: "aberto",
  created_by: "u1", updated_by: "u1", created_at: "2026-07-01", updated_at: "2026-07-01",
};

function renderSection(overrides: Partial<ComponentProps<typeof ClientRiskOpportunitiesSection>> = {}) {
  return render(<ClientRiskOpportunitiesSection clientId="c1" defaultOwnerManagerId="m1" items={[]} managers={managers} canManage={true} {...overrides} />);
}

describe("ClientRiskOpportunitiesSection", () => {
  afterEach(cleanup);
  beforeEach(() => {
    refresh.mockClear(); from.mockClear(); insert.mockReset(); update.mockReset(); remove.mockReset();
    insert.mockResolvedValue({ error: null }); update.mockResolvedValue({ error: null }); remove.mockResolvedValue({ error: null });
  });

  it("exibe os dois estados vazios e bloqueia escrita para analistas", () => {
    renderSection({ canManage: false });
    expect(screen.getByText("Nenhum risco estruturado para este cliente.")).toBeTruthy();
    expect(screen.getByText("Nenhuma oportunidade estruturada para este cliente.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Novo item" })).toBeNull();
  });

  it("apresenta totais, prioridade e status por texto", () => {
    renderSection({ items: [risk] });
    expect(screen.getByText("Prioridade Alta · 9/9")).toBeTruthy();
    expect(screen.getByText("Aberto")).toBeTruthy();
    expect(screen.getByText("Vencido")).toBeTruthy();
    expect(screen.getByText("Adoção em queda")).toBeTruthy();
  });

  it("cria um item e atualiza a tela apenas após confirmação", async () => {
    renderSection();
    fireEvent.click(screen.getByRole("button", { name: "Novo item" }));
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: "Expansão para nova unidade" } });
    fireEvent.change(screen.getByLabelText(/Data-alvo/), { target: { value: "2026-09-10" } });
    fireEvent.change(screen.getByLabelText(/Tipo/), { target: { value: "oportunidade" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar item" }));
    await waitFor(() => expect(insert).toHaveBeenCalledWith("client_risk_opportunities", expect.objectContaining({
      client_id: "c1", kind: "oportunidade", title: "Expansão para nova unidade", owner_manager_id: "m1",
    })));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Item adicionado à carteira."));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("mantém o modal aberto quando a persistência falha", async () => {
    insert.mockResolvedValue({ error: { message: "denied" } });
    renderSection();
    fireEvent.click(screen.getByRole("button", { name: "Novo item" }));
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: "Risco de prazo" } });
    fireEvent.change(screen.getByLabelText(/Data-alvo/), { target: { value: "2026-09-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar item" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Não foi possível salvar"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("edita e exige confirmação antes de remover", async () => {
    renderSection({ items: [risk] });
    fireEvent.click(screen.getByRole("button", { name: "Editar risco: Adoção em queda" }));
    fireEvent.change(screen.getByLabelText(/Status/), { target: { value: "em_andamento" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar item" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith("client_risk_opportunities", expect.objectContaining({ status: "em_andamento" }), "id", "r1"));

    fireEvent.click(screen.getByRole("button", { name: "Editar risco: Adoção em queda" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(screen.getByRole("alert").textContent).toContain("não pode ser desfeita");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar remoção" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith("client_risk_opportunities", "id", "r1"));
  });
});
