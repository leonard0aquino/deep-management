import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientCadences } from "@/components/dashboard/client/client-cadences";
import type { ClientCadenceProgress, CustomerPlaybook, CustomerPlaybookStep, DeepManager, Product } from "@/lib/types/database";

const refresh = vi.fn();
const rpc = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));
vi.mock("@/lib/actions/revalidate-dashboard", () => ({ revalidateDashboardCache: vi.fn() }));

const playbook: CustomerPlaybook = { id: "pb1", name: "Onboarding executivo", description: "Entrada do cliente", active: true, created_by: "u1", updated_by: "u1", created_at: "2026-07-01", updated_at: "2026-07-01" };
const step: CustomerPlaybookStep = { id: "s1", playbook_id: "pb1", position: 1, title: "Kickoff", guidance: "Alinhar objetivos", day_offset: 0, priority: "alta", recommended_interaction_type: "meeting", created_by: "u1", updated_by: "u1", created_at: "2026-07-01", updated_at: "2026-07-01" };
const product: Product = { id: "p1", name: "Suite", slug: "suite", color: null, active: true, created_at: "2026-01-01" };
const manager: DeepManager = { id: "m1", name: "Marina", email: null, avatar_color: null, active: true, linked_user_id: "u1", created_at: "2026-01-01" };
const cadence: ClientCadenceProgress = { id: "c1", playbook_id: "pb1", playbook_name: "Onboarding executivo", client_id: "client1", client_name: "Acme", product_id: "p1", product_name: "Suite", owner_manager_id: "m1", owner_manager_name: "Marina", start_date: "2026-07-20", status: "active", created_by: "u1", created_at: "2026-07-20", completed_at: null, total_steps: 4, completed_steps: 1, progress_percent: 25, next_task_id: "t2", next_step: "Revisão de valor", next_due_date: "2026-07-25", next_interaction_type: "meeting", next_task_status: "pending", next_step_overdue: true };

const props = { clientId: "client1", cadences: [cadence], playbooks: [playbook], playbookSteps: [step], products: [product], managers: [manager] };

describe("ClientCadences", () => {
  beforeEach(() => { rpc.mockReset(); refresh.mockClear(); });
  afterEach(cleanup);

  it("mostra progresso, próxima etapa, canal e atraso por texto", () => {
    render(<ClientCadences {...props} canManage={false} />);
    expect(screen.getByText("1 de 4 etapas tratadas")).toBeTruthy();
    expect(screen.getByText("Revisão de valor")).toBeTruthy();
    expect(screen.getByText(/Reunião/)).toBeTruthy();
    expect(screen.getByText("Próxima etapa atrasada")).toBeTruthy();
  });

  it("mantém analista em modo somente leitura", () => {
    render(<ClientCadences {...props} canManage={false} />);
    expect(screen.queryByRole("button", { name: "Iniciar cadência" })).toBeNull();
  });

  it("aplica playbook pelo RPC transacional e confirma sucesso", async () => {
    rpc.mockResolvedValue({ data: "cad2", error: null });
    render(<ClientCadences {...props} cadences={[]} canManage />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar cadência" }));
    fireEvent.change(screen.getByLabelText("Playbook"), { target: { value: "pb1" } });
    fireEvent.change(screen.getByLabelText("Produto"), { target: { value: "p1" } });
    fireEvent.change(screen.getByLabelText("Responsável AISphere"), { target: { value: "m1" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar cadência" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("apply_customer_playbook", expect.objectContaining({ p_playbook_id: "pb1", p_client_id: "client1", p_product_id: "p1", p_owner_manager_id: "m1" })));
    expect((await screen.findByRole("status")).textContent).toContain("Cadência iniciada");
  });

  it("exibe o erro do banco sem confirmar sucesso", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "cadência ativa já existe" } });
    render(<ClientCadences {...props} cadences={[]} canManage />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar cadência" }));
    fireEvent.change(screen.getByLabelText("Playbook"), { target: { value: "pb1" } });
    fireEvent.change(screen.getByLabelText("Produto"), { target: { value: "p1" } });
    fireEvent.change(screen.getByLabelText("Responsável AISphere"), { target: { value: "m1" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar cadência" }));
    expect((await screen.findByRole("alert")).textContent).toContain("cadência ativa já existe");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
