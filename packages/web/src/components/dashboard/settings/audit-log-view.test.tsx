import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLogView } from "@/components/dashboard/settings/audit-log-view";
import type { AuditLogEntry, UserProfile } from "@/lib/types/database";

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

function entry(overrides: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: "1",
    table_name: "clients",
    record_id: "c1234567-89ab-cdef-0123-456789abcdef",
    action: "INSERT",
    actor: "u1",
    actor_name: "Maria",
    actor_email: "maria@deep.com",
    diff: { name: "Acme Corp" },
    created_at: "2026-07-24T10:00:00.000Z",
    ...overrides,
  };
}

const profiles: UserProfile[] = [
  { id: "u1", name: "Maria", role: "admin", manager_user_id: null, created_at: "2026-01-01" },
];

describe("AuditLogView", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: [], error: null });
  });
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("mostra a descrição amigável de cada entrada", () => {
    render(<AuditLogView initialEntries={[entry({})]} profiles={profiles} />);
    expect(screen.getByText('Maria criou cliente "Acme Corp"')).toBeTruthy();
  });

  it("mensagem de vazio quando não há entradas", () => {
    render(<AuditLogView initialEntries={[]} profiles={profiles} />);
    expect(screen.getByText("Nenhuma alteração encontrada.")).toBeTruthy();
  });

  it("expande a linha para mostrar o diff e os campos alterados", () => {
    render(
      <AuditLogView
        initialEntries={[
          entry({
            action: "UPDATE",
            diff: { before: { name: "Acme" }, after: { name: "Acme Corp" } },
          }),
        ]}
        profiles={profiles}
      />,
    );
    expect(screen.queryByText(/Campos alterados/)).toBeNull();
    fireEvent.click(screen.getByText('Maria atualizou cliente "Acme Corp"'));
    expect(screen.getByText("Campos alterados: name")).toBeTruthy();
  });

  it("busca dispara a RPC com p_search após o debounce", async () => {
    render(<AuditLogView initialEntries={[entry({})]} profiles={profiles} />);
    rpc.mockClear();
    fireEvent.change(screen.getByLabelText("Buscar na auditoria"), { target: { value: "acme" } });
    await waitFor(
      () =>
        expect(rpc).toHaveBeenCalledWith(
          "get_audit_log",
          expect.objectContaining({ p_search: "acme", p_offset: 0 }),
        ),
      { timeout: 1000 },
    );
  });

  it("filtro de ação dispara a RPC com p_action", async () => {
    render(<AuditLogView initialEntries={[entry({})]} profiles={profiles} />);
    rpc.mockClear();
    fireEvent.click(screen.getByRole("combobox", { name: "Filtrar por ação" }));
    const option = await screen.findByRole("option", { name: "DELETE" });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("get_audit_log", expect.objectContaining({ p_action: "DELETE" })),
    );
  });

  it("carregar mais busca a próxima página e concatena resultados", async () => {
    const page1 = Array.from({ length: 30 }, (_, i) => entry({ id: `p1-${i}`, table_name: "clients" }));
    const page2 = [entry({ id: "p2-0", table_name: "products", diff: { name: "Suite" } })];
    rpc.mockResolvedValueOnce({ data: page2, error: null });
    render(<AuditLogView initialEntries={page1} profiles={profiles} />);
    fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("get_audit_log", expect.objectContaining({ p_offset: 30 })));
    expect(await screen.findByText('Maria criou produto "Suite"')).toBeTruthy();
  });

  it("exportar CSV dispara o download do arquivo", () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const createObjectURL = vi.fn(() => "blob:mock");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

    render(<AuditLogView initialEntries={[entry({})]} profiles={profiles} />);
    fireEvent.click(screen.getByRole("button", { name: /Exportar CSV/ }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
