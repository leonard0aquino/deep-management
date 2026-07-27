import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientSuccessPlanSection } from "@/components/dashboard/client/client-success-plan";
import type { ClientSuccessMilestone, ClientSuccessPlan, DeepManager } from "@/lib/types/database";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const insert = vi.fn();
const update = vi.fn();
const remove = vi.fn();
const from = vi.fn((table: string) => ({
  insert: (payload: Record<string, unknown>) => insert(table, payload),
  update: (payload: Record<string, unknown>) => ({
    eq: (column: string, value: unknown) => update(table, payload, column, value),
  }),
  delete: () => ({
    eq: (column: string, value: unknown) => remove(table, column, value),
  }),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));

const managers: DeepManager[] = [
  { id: "m1", name: "Marina", email: null, avatar_color: null, active: true, linked_user_id: "u1", created_at: "2026-01-01" },
  { id: "m2", name: "Carlos", email: null, avatar_color: null, active: true, linked_user_id: "u2", created_at: "2026-01-01" },
];

const plan: ClientSuccessPlan = {
  id: "sp1",
  client_id: "c1",
  objective: "Aumentar a adoção da plataforma",
  expected_outcome: "Operação usando o produto semanalmente",
  owner_manager_id: "m1",
  target_date: "2026-12-15",
  status: "ativo",
  created_by: "u1",
  updated_by: "u1",
  created_at: "2026-07-27",
  updated_at: "2026-07-27",
};

const milestones: ClientSuccessMilestone[] = [
  { id: "sm1", plan_id: "sp1", title: "Treinar usuários-chave", owner_manager_id: "m1", target_date: "2026-09-01", status: "concluido", created_by: "u1", updated_by: "u1", created_at: "2026-07-27", updated_at: "2026-07-27" },
  { id: "sm2", plan_id: "sp1", title: "Ativar nova unidade", owner_manager_id: "m2", target_date: "2026-10-01", status: "pendente", created_by: "u1", updated_by: "u1", created_at: "2026-07-27", updated_at: "2026-07-27" },
  { id: "sm3", plan_id: "sp1", title: "Marco descartado", owner_manager_id: null, target_date: "2026-11-01", status: "cancelado", created_by: "u1", updated_by: "u1", created_at: "2026-07-27", updated_at: "2026-07-27" },
];

function renderSection(overrides: Partial<ComponentProps<typeof ClientSuccessPlanSection>> = {}) {
  return render(
    <ClientSuccessPlanSection
      clientId="c1"
      defaultOwnerManagerId="m1"
      plan={null}
      milestones={[]}
      managers={managers}
      canManage={true}
      {...overrides}
    />,
  );
}

describe("ClientSuccessPlanSection", () => {
  afterEach(cleanup);

  beforeEach(() => {
    refresh.mockClear();
    from.mockClear();
    insert.mockReset();
    update.mockReset();
    remove.mockReset();
    insert.mockResolvedValue({ error: null });
    update.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
  });

  it("exibe estado vazio sem ação de escrita para analistas", () => {
    renderSection({ canManage: false });
    expect(screen.getByText("Nenhum plano de sucesso criado")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Criar plano" })).toBeNull();
  });

  it("cria um plano e só atualiza a tela após confirmação do banco", async () => {
    renderSection();
    fireEvent.click(screen.getByRole("button", { name: "Criar plano" }));
    fireEvent.change(screen.getByLabelText(/Objetivo/), { target: { value: "Reduzir o tempo operacional" } });
    fireEvent.change(screen.getByLabelText(/Resultado esperado/), { target: { value: "Equipe economiza vinte horas por mês" } });
    fireEvent.change(screen.getByLabelText(/Data-alvo/), { target: { value: "2026-12-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar plano" }));

    await waitFor(() => expect(insert).toHaveBeenCalledWith("client_success_plans", expect.objectContaining({
      client_id: "c1",
      owner_manager_id: "m1",
      objective: "Reduzir o tempo operacional",
      status: "rascunho",
    })));
    expect(screen.getByRole("status").textContent).toBe("Plano de sucesso criado.");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("mantém o modal aberto e informa falha de persistência", async () => {
    insert.mockResolvedValue({ error: { message: "denied" } });
    renderSection();
    fireEvent.click(screen.getByRole("button", { name: "Criar plano" }));
    fireEvent.change(screen.getByLabelText(/Objetivo/), { target: { value: "Objetivo válido" } });
    fireEvent.change(screen.getByLabelText(/Resultado esperado/), { target: { value: "Resultado válido" } });
    fireEvent.change(screen.getByLabelText(/Data-alvo/), { target: { value: "2026-12-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar plano" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Não foi possível salvar o plano"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("calcula o progresso e apresenta status por texto", () => {
    renderSection({ plan, milestones });
    expect(screen.getAllByText("50%").length).toBeGreaterThan(0);
    expect(screen.getByText("Ativo")).toBeTruthy();
    expect(screen.getByText("Concluído")).toBeTruthy();
    expect(screen.getByText("Pendente")).toBeTruthy();
    expect(screen.getByText("Cancelado")).toBeTruthy();
  });

  it("adiciona e edita um marco", async () => {
    const { rerender } = renderSection({ plan, milestones: [] });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar marco" }));
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: "Concluir onboarding" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar marco" }));
    await waitFor(() => expect(insert).toHaveBeenCalledWith("client_success_milestones", expect.objectContaining({
      plan_id: "sp1",
      title: "Concluir onboarding",
      status: "pendente",
    })));

    rerender(
      <ClientSuccessPlanSection clientId="c1" defaultOwnerManagerId="m1" plan={plan} milestones={milestones} managers={managers} canManage={true} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Editar marco: Treinar usuários-chave" }));
    fireEvent.change(screen.getByLabelText(/^Status/), { target: { value: "em_andamento" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar marco" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith("client_success_milestones", expect.objectContaining({ status: "em_andamento" }), "id", "sm1"));
  });

  it("exige confirmação antes de remover um marco", async () => {
    renderSection({ plan, milestones: [milestones[0]] });
    fireEvent.click(screen.getByRole("button", { name: "Editar marco: Treinar usuários-chave" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(screen.getByRole("alert").textContent).toContain("não pode ser desfeita");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar remoção" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith("client_success_milestones", "id", "sm1"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
