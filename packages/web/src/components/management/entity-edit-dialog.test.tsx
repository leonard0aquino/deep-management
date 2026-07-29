import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EntityEditDialog } from "@/components/management/entity-edit-dialog";
import type { Client, ClientContact, Product } from "@/lib/types/database";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const update = vi.fn();
const from = vi.fn((table: string) => ({
  update: (payload: Record<string, unknown>) => ({
    eq: (column: string, value: unknown) => update(table, payload, column, value),
  }),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));
vi.mock("@/lib/actions/revalidate-dashboard", () => ({ revalidateDashboardCache: vi.fn() }));

const client: Client = {
  id: "c1", name: "Acme", segment: null, logo_url: null, contract_value: null,
  contract_renewal_date: null, owner_manager_id: null, active: true, custom_fields: {}, created_at: "2026-01-01",
};
const managers = [{
  id: "m1", name: "Marina", email: null, avatar_color: null, active: true,
  linked_user_id: "u1", created_at: "2026-01-01",
}];
const product: Product = {
  id: "p1", name: "Suite", slug: "suite", color: null, active: true, created_at: "2026-01-01",
};
const person: ClientContact = {
  id: "pe1", client_id: "c1", name: "Jane", role: null, email: null, phone: null,
  influence: "media", relationship_role: null, owner_manager_id: null,
  reports_to_contact_id: null, photo_url: null, created_at: "2026-01-01",
};

describe("EntityEditDialog", () => {
  beforeEach(() => { refresh.mockClear(); from.mockClear(); update.mockReset(); });

  it("salva cliente e exibe feedback de sucesso", async () => {
    update.mockResolvedValue({ error: null });
    render(<EntityEditDialog kind="client" item={client} managers={managers} />);
    fireEvent.click(screen.getByRole("button", { name: /Editar cliente/i }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Alterações salvas."));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("clients");
  });

  it("orienta a responsabilidade por produto e não altera o campo legado", async () => {
    update.mockResolvedValue({ error: null });
    render(<EntityEditDialog kind="client" item={client} managers={managers} />);
    fireEvent.click(screen.getByRole("button", { name: /Editar cliente/i }));
    expect(screen.getAllByText("Os responsáveis são definidos por produto na visão 360° do cliente.").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith("clients", expect.not.objectContaining({ owner_manager_id: expect.anything() }), "id", "c1");
  });

  it("exibe a mensagem de erro retornada pelo Supabase e não revalida", async () => {
    update.mockResolvedValue({ error: { message: "Falha ao salvar" } });
    render(<EntityEditDialog kind="client" item={client} managers={managers} />);
    fireEvent.click(screen.getByRole("button", { name: /Editar cliente/i }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Falha ao salvar"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("exibe feedback de falha de conexão quando a chamada rejeita", async () => {
    update.mockRejectedValue(new Error("network down"));
    render(<EntityEditDialog kind="client" item={client} managers={managers} />);
    fireEvent.click(screen.getByRole("button", { name: /Editar cliente/i }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Falha de conexão. Tente novamente."));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("salva produto usando a tabela products", async () => {
    update.mockResolvedValue({ error: null });
    render(<EntityEditDialog kind="product" item={product} />);
    fireEvent.click(screen.getByRole("button", { name: /Editar produto/i }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(from).toHaveBeenCalledWith("products"));
  });

  it("salva pessoa usando a tabela client_contacts", async () => {
    update.mockResolvedValue({ error: null });
    render(<EntityEditDialog kind="person" item={person} managers={managers} />);
    fireEvent.click(screen.getByRole("button", { name: /Editar pessoa/i }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(from).toHaveBeenCalledWith("client_contacts"));
  });

  it("persiste papel relacional e responsável AISphere", async () => {
    update.mockResolvedValue({ error: null });
    render(<EntityEditDialog kind="person" item={person} managers={managers} />);
    fireEvent.click(screen.getByRole("button", { name: /Editar pessoa/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /Papel no relacionamento/i }), { target: { value: "patrocinador" } });
    fireEvent.change(screen.getByRole("combobox", { name: /Responsável AISphere/i }), { target: { value: "m1" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith("client_contacts", expect.objectContaining({ relationship_role: "patrocinador", owner_manager_id: "m1" }), "id", "pe1"));
  });
});
