import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionTaskDialog, type ActionTaskDialogIntent } from "@/components/dashboard/executive/action-task-dialog";
import type { ActionTaskItem } from "@/services/action-tasks";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

type DbResponse = { data: { id: string } | null; error: { message: string } | null };
const single = vi.fn<() => Promise<DbResponse>>(() => Promise.resolve({ data: { id: "t1" }, error: null }));
const select = vi.fn(() => ({ single }));
const eq = vi.fn(() => ({ select }));
const update = vi.fn(() => ({ eq }));
const upsert = vi.fn(() => ({ select }));
const from = vi.fn(() => ({ update, upsert }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));

function item(overrides: Partial<ActionTaskItem> = {}): ActionTaskItem {
  return {
    key: "v1:c1:p1:critical",
    clientId: "c1",
    clientName: "Acme",
    productId: "p1",
    productName: "Suite",
    priority: "alta",
    reason: "Relacionamento crítico.",
    recommendedDueDate: "2026-07-28",
    task: null,
    status: "pending",
    assignedTo: null,
    dueDate: "2026-07-28",
    updatedAt: null,
    legacyDismissed: false,
    ...overrides,
  };
}

function renderDialog(intent: ActionTaskDialogIntent) {
  return render(
    <ActionTaskDialog
      open={true}
      onOpenChange={vi.fn()}
      intent={intent}
      users={[{ id: "u1", name: "Ana" }]}
    />,
  );
}

describe("ActionTaskDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    single.mockImplementation(() => Promise.resolve({ data: { id: "t1" }, error: null }));
  });

  it("materializa uma recomendação por upsert com chave estável", async () => {
    renderDialog({ item: item(), assignedTo: "u1" });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Salvar tarefa" }));

    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      action_key: "v1:c1:p1:critical",
      assigned_to: "u1",
      status: "pending",
      due_date: "2026-07-28",
    }), { onConflict: "action_key" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("exige resultado antes de concluir uma tarefa", () => {
    renderDialog({ item: item({ status: "in_progress" }), status: "completed" });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Salvar tarefa" }));

    expect(screen.getByRole("alert").textContent).toContain("resultado alcançado");
    expect(upsert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("mantém o diálogo aberto e informa erro quando o banco rejeita a mudança", async () => {
    single.mockImplementationOnce(() => Promise.resolve({ data: null, error: { message: "denied" } }));
    renderDialog({ item: item() });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Salvar tarefa" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível atualizar a tarefa");
    expect(refresh).not.toHaveBeenCalled();
  });
});
