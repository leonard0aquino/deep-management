import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InteractionFormDialog } from "@/components/dashboard/registros/interaction-form-dialog";
import type { InteractionView } from "@/lib/types/database";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const from = vi.fn(() => ({
  select: () => ({ order: () => Promise.resolve({ data: [] }) }),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));

function activity(overrides: Partial<InteractionView>): InteractionView {
  return {
    id: "i1", client_id: "c1", product_id: "p1", manager_id: null, contact_id: null,
    interaction_type: "meeting", topic: "Tema original", notes: null, relevance: 3,
    occurred_at: "2026-07-20", links: [], created_by: null, created_at: "2026-01-01",
    updated_at: "2026-01-01", client_name: "Acme", product_name: "Suite",
    product_color: null, manager_name: null, contact_name: null, days_since_contact: 1,
    status: "ok",
    ...overrides,
  };
}

describe("InteractionFormDialog — ressincronização entre atividades", () => {
  beforeEach(() => { from.mockClear(); });

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
});
