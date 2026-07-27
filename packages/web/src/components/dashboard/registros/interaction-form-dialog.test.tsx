import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InteractionFormDialog } from "@/components/dashboard/registros/interaction-form-dialog";
import type { InteractionView } from "@/lib/types/database";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const updateEq = vi.fn(() => Promise.resolve({ error: null }));
const updateInteraction = vi.fn(() => ({ eq: updateEq }));
const insertInteraction = vi.fn(() => Promise.resolve({ error: null }));
const from = vi.fn((table: string) =>
  table === "interactions"
    ? { update: updateInteraction, insert: insertInteraction }
    : { select: () => ({ order: () => Promise.resolve({ data: [] }) }) },
);
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));
vi.mock("@/lib/actions/revalidate-dashboard", () => ({ revalidateDashboardCache: vi.fn() }));

function activity(overrides: Partial<InteractionView>): InteractionView {
  return {
    id: "i1", client_id: "c1", product_id: "p1", manager_id: null, contact_id: null,
    interaction_type: "meeting", topic: "Tema original", notes: null, relevance: 3,
    decisions: null, customer_sentiment: null, risks: null, opportunities: null,
    next_step: null, next_step_owner: null, next_step_due_date: null,
    additional_participants: [], confidential: false,
    occurred_at: "2026-07-20", links: [], created_by: null, created_at: "2026-01-01",
    updated_at: "2026-01-01", client_name: "Acme", product_name: "Suite",
    product_color: null, manager_name: null, contact_name: null, days_since_contact: 1,
    status: "ok",
    ...overrides,
  };
}

describe("InteractionFormDialog — ressincronização entre atividades", () => {
  beforeEach(() => {
    from.mockClear();
    updateInteraction.mockClear();
    updateEq.mockClear();
    insertInteraction.mockClear();
  });

  it("atualiza os campos ao reabrir o diálogo para uma atividade diferente", async () => {
    const activityA = activity({ id: "i1", topic: "Renovação do contrato" });
    const activityB = activity({ id: "i2", topic: "Onboarding do produto" });

    const { rerender } = render(
      <InteractionFormDialog
        open={true}
        onOpenChange={() => {}}
        clients={[]}
        products={[]}
        managers={[]}
        contacts={[]}
        editing={activityA}
      />,
    );
    await waitFor(() => expect(screen.getByDisplayValue("Renovação do contrato")).toBeTruthy());

    // Simula o fechamento do diálogo (fluxo real: onOpenChange(false) após salvar/cancelar)
    // e a reabertura para editar uma atividade diferente.
    rerender(
      <InteractionFormDialog
        open={false}
        onOpenChange={() => {}}
        clients={[]}
        products={[]}
        managers={[]}
        contacts={[]}
        editing={activityA}
      />,
    );
    rerender(
      <InteractionFormDialog
        open={true}
        onOpenChange={() => {}}
        clients={[]}
        products={[]}
        managers={[]}
        contacts={[]}
        editing={activityB}
      />,
    );

    await waitFor(() => expect(screen.getByDisplayValue("Onboarding do produto")).toBeTruthy());
    expect(screen.queryByDisplayValue("Renovação do contrato")).toBeNull();
  });

  it("ressincroniza todos os campos de memória ao alternar entre atividades", async () => {
    const activityA = activity({
      id: "i1",
      notes: "Resumo antigo",
      decisions: "Decisão antiga",
      next_step: "Ação antiga",
      additional_participants: ["Ana"],
      confidential: false,
    });
    const activityB = activity({
      id: "i2",
      notes: "Resumo novo",
      decisions: "Decisão nova",
      next_step: "Ação nova",
      additional_participants: ["Bruno", "Carla"],
      confidential: true,
    });

    const props = {
      onOpenChange: () => {}, clients: [], products: [], managers: [], contacts: [],
    };
    const { rerender } = render(
      <InteractionFormDialog open={true} editing={activityA} {...props} />,
    );
    expect(await screen.findByDisplayValue("Resumo antigo")).toBeTruthy();

    rerender(<InteractionFormDialog open={false} editing={activityA} {...props} />);
    rerender(<InteractionFormDialog open={true} editing={activityB} {...props} />);

    expect(await screen.findByDisplayValue("Resumo novo")).toBeTruthy();
    expect(screen.getByDisplayValue("Decisão nova")).toBeTruthy();
    expect(screen.getByDisplayValue("Ação nova")).toBeTruthy();
    expect(screen.getByDisplayValue("Bruno, Carla")).toBeTruthy();
    const activeDialog = screen.getByRole("dialog");
    expect((within(activeDialog).getByLabelText("Interação confidencial") as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByDisplayValue("Resumo antigo")).toBeNull();
  });

  it("persiste memória normalizada, participantes e múltiplos links na edição", async () => {
    render(
      <InteractionFormDialog
        open={true}
        onOpenChange={() => {}}
        clients={[]}
        products={[]}
        managers={[]}
        contacts={[]}
        editing={activity({ customer_sentiment: "positive" })}
      />,
    );

    const dialog = within(screen.getByRole("dialog"));

    fireEvent.change(dialog.getByLabelText("Resumo e notas"), { target: { value: "  Contexto  " } });
    fireEvent.change(dialog.getByLabelText("Decisões tomadas"), { target: { value: "Piloto aprovado" } });
    fireEvent.change(dialog.getByLabelText("Participantes adicionais"), { target: { value: "Ana, Bruno, Ana" } });
    fireEvent.change(dialog.getByLabelText("Riscos identificados"), { target: { value: "Prazo curto" } });
    fireEvent.change(dialog.getByLabelText("Oportunidades identificadas"), { target: { value: "Nova unidade" } });
    fireEvent.change(dialog.getByLabelText("Ação combinada"), { target: { value: "Enviar plano" } });
    fireEvent.change(dialog.getByLabelText("Responsável pelo próximo passo"), { target: { value: "Marina" } });
    fireEvent.change(dialog.getByLabelText("Prazo do próximo passo"), { target: { value: "2026-08-01" } });
    fireEvent.click(dialog.getByLabelText("Interação confidencial"));

    fireEvent.click(dialog.getByRole("button", { name: "Adicionar link" }));
    fireEvent.change(dialog.getByLabelText("Nome do link 1"), { target: { value: "Ata" } });
    fireEvent.change(dialog.getByLabelText("URL do link 1"), { target: { value: "https://example.com/ata" } });
    fireEvent.click(dialog.getByRole("button", { name: "Adicionar link" }));
    fireEvent.change(dialog.getByLabelText("Nome do link 2"), { target: { value: "Plano" } });
    fireEvent.change(dialog.getByLabelText("URL do link 2"), { target: { value: "https://example.com/plano" } });
    fireEvent.click(dialog.getByLabelText("Remover link 1"));

    fireEvent.click(dialog.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(updateInteraction).toHaveBeenCalledTimes(1));
    expect(updateInteraction).toHaveBeenCalledWith(expect.objectContaining({
      notes: "Contexto",
      decisions: "Piloto aprovado",
      customer_sentiment: "positive",
      risks: "Prazo curto",
      opportunities: "Nova unidade",
      next_step: "Enviar plano",
      next_step_owner: "Marina",
      next_step_due_date: "2026-08-01",
      additional_participants: ["Ana", "Bruno"],
      links: [{ label: "Plano", url: "https://example.com/plano" }],
      confidential: true,
    }));
    expect(updateEq).toHaveBeenCalledWith("id", "i1");
  });

  it("persiste a memória estruturada ao criar uma nova interação", async () => {
    const onOpenChange = vi.fn();
    const props = {
      onOpenChange,
      clients: [],
      products: [],
      managers: [],
      contacts: [],
      editing: null,
      initialClientId: "c1",
      initialProductId: "p1",
    };
    const { rerender } = render(
      <InteractionFormDialog open={false} {...props} />,
    );

    rerender(<InteractionFormDialog open={true} {...props} />);
    const dialogElement = screen.getByRole("dialog");
    const dialog = within(dialogElement);
    const contactDate = dialogElement.querySelector<HTMLInputElement>('input[type="date"]');

    fireEvent.change(dialog.getByPlaceholderText("Ex: Renovação"), {
      target: { value: "Kickoff executivo" },
    });
    fireEvent.change(contactDate!, { target: { value: "2026-07-27" } });
    fireEvent.change(dialog.getByLabelText("Resumo e notas"), {
      target: { value: "Alinhamento inicial" },
    });
    fireEvent.change(dialog.getByLabelText("Decisões tomadas"), {
      target: { value: "Piloto confirmado" },
    });
    fireEvent.change(dialog.getByLabelText("Participantes adicionais"), {
      target: { value: "Ana, Bruno" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(insertInteraction).toHaveBeenCalledTimes(1));
    expect(insertInteraction).toHaveBeenCalledWith(expect.objectContaining({
      client_id: "c1",
      product_id: "p1",
      topic: "Kickoff executivo",
      occurred_at: "2026-07-27",
      notes: "Alinhamento inicial",
      decisions: "Piloto confirmado",
      additional_participants: ["Ana", "Bruno"],
      links: [],
      confidential: false,
    }));
    expect(updateInteraction).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
