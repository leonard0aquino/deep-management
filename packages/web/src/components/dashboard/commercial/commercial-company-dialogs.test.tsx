import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommercialCompanyDialog } from "./commercial-company-dialogs";
import type { Client, ClientContact } from "@/lib/types/database";

const company: Client = {
  id: "c2", name: "Nova SA", segment: "Financeiro", logo_url: null,
  contract_value: null, contract_renewal_date: null, owner_manager_id: null,
  client_kind: "prospect", active: true, custom_fields: {}, created_at: "2026-08-04",
};
const contact: ClientContact = {
  id: "ct2", client_id: "c2", name: "Ana Compras", role: null,
  email: "ana@nova.com", phone: "11999999999", influence: "media",
  relationship_role: null,
  reports_to_contact_id: null, photo_url: null, owner_manager_id: null, created_at: "2026-08-04",
};
const insertClient = vi.fn();
const insertContact = vi.fn();
const result = (data: unknown) => ({ select: () => ({ single: () => Promise.resolve({ data, error: null }) }) });

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: table === "clients" ? insertClient : insertContact,
    }),
  }),
}));

describe("CommercialCompanyDialog", () => {
  beforeEach(() => {
    insertClient.mockReset().mockReturnValue(result(company));
    insertContact.mockReset().mockReturnValue(result(contact));
  });
  afterEach(cleanup);

  it("cria empresa como Prospect e salva o contato responsável", async () => {
    const onCreated = vi.fn();
    render(<CommercialCompanyDialog open onOpenChange={() => {}} existingClients={[]} onCreated={onCreated} />);
    fireEvent.change(screen.getByLabelText("Empresa"), { target: { value: "Nova SA" } });
    fireEvent.change(screen.getByLabelText("Segmento"), { target: { value: "Financeiro" } });
    fireEvent.change(screen.getByLabelText("Nome do contato"), { target: { value: "Ana Compras" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@nova.com" } });
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "11999999999" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar empresa" }));

    await waitFor(() => expect(insertClient).toHaveBeenCalledWith(expect.objectContaining({
      name: "Nova SA", client_kind: "prospect", active: true,
    })));
    expect(insertContact).toHaveBeenCalledWith(expect.objectContaining({
      client_id: "c2", name: "Ana Compras", email: "ana@nova.com", phone: "11999999999",
    }));
    expect(onCreated).toHaveBeenCalledWith({ company, contact });
  });

  it("bloqueia empresa duplicada antes de acessar o banco", async () => {
    render(<CommercialCompanyDialog open onOpenChange={() => {}} existingClients={[company]} onCreated={() => {}} />);
    fireEvent.change(screen.getByLabelText("Empresa"), { target: { value: " nova sa " } });
    fireEvent.click(screen.getByRole("button", { name: "Criar empresa" }));
    expect((await screen.findByRole("alert")).textContent).toContain("já está cadastrada");
    expect(insertClient).not.toHaveBeenCalled();
  });
});
