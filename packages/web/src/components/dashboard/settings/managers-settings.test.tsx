import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ManagersSettings } from "@/components/dashboard/settings/managers-settings";
import type { DeepManager, UserProfile } from "@/lib/types/database";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const inviteManagerAsUser = vi.fn();
vi.mock("@/app/(app)/admin/actions", () => ({ inviteManagerAsUser: (...args: unknown[]) => inviteManagerAsUser(...args) }));

const eq = vi.fn();
const update = vi.fn(() => ({ eq }));
const remove = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ update, delete: remove }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));

function manager(overrides: Partial<DeepManager>): DeepManager {
  return {
    id: "m1", name: "Carlos", email: "carlos@deep.com", avatar_color: null,
    active: true, linked_user_id: null, created_at: "2026-01-01",
    ...overrides,
  };
}

const users: UserProfile[] = [
  { id: "u1", name: "Ana Souza", role: "gerente", created_at: "2026-01-01" },
  { id: "u2", name: "Bruno Lima", role: "analista", created_at: "2026-01-01" },
];

describe("ManagersSettings", () => {
  beforeEach(() => {
    from.mockClear(); update.mockClear(); remove.mockClear();
    eq.mockReset(); eq.mockResolvedValue({ error: null });
    inviteManagerAsUser.mockReset();
  });
  afterEach(() => { cleanup(); document.body.innerHTML = ""; });

  it("exige confirmação antes de excluir um gestor", async () => {
    render(<ManagersSettings managers={[manager({})]} users={users} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir Carlos" }));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(eq).toHaveBeenCalledWith("id", "m1");
  });

  it("mostra 'Sem login' e permite convidar como usuário novo", async () => {
    render(<ManagersSettings managers={[manager({})]} users={users} />);
    expect(screen.getByText("Sem login")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Convidar Carlos como usuário" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar convite" }));
    await waitFor(() => expect(inviteManagerAsUser).toHaveBeenCalledWith("m1", "carlos@deep.com", "Carlos"));
  });

  it("mostra o usuário vinculado e permite desvincular", async () => {
    render(<ManagersSettings managers={[manager({ linked_user_id: "u1" })]} users={users} />);
    expect(screen.getByText("Vinculado a Ana Souza")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Desvincular Carlos" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ linked_user_id: null }));
  });

  it("vincula o gestor a um usuário existente", async () => {
    render(<ManagersSettings managers={[manager({})]} users={users} />);
    fireEvent.click(screen.getByRole("button", { name: "Vincular Carlos a usuário existente" }));
    fireEvent.click(screen.getAllByRole("combobox", { name: /Usuário para vincular a Carlos/i })[0]);
    const option = await screen.findByRole("option", { name: "Ana Souza" });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    fireEvent.click(screen.getByRole("button", { name: "Vincular" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ linked_user_id: "u1" }));
    expect(eq).toHaveBeenCalledWith("id", "m1");
  });

  it("edita nome e e-mail de um gestor", async () => {
    render(<ManagersSettings managers={[manager({})]} users={users} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Carlos" }));
    const nameInput = screen.getByRole("textbox", { name: "Nome de Carlos" });
    fireEvent.change(nameInput, { target: { value: "Carlos Eduardo" } });
    const emailInput = screen.getByRole("textbox", { name: "E-mail de Carlos" });
    fireEvent.change(emailInput, { target: { value: "carlos.eduardo@deep.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ name: "Carlos Eduardo", email: "carlos.eduardo@deep.com" }));
    expect(eq).toHaveBeenCalledWith("id", "m1");
  });

  it("exibe erro quando salvar a edição falha", async () => {
    eq.mockResolvedValue({ error: { message: "nome duplicado" } });
    render(<ManagersSettings managers={[manager({})]} users={users} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Carlos" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/nome duplicado/));
  });

  it("não oferece um usuário já vinculado a outro gestor", async () => {
    render(
      <ManagersSettings
        managers={[manager({ id: "m1", name: "Carlos", linked_user_id: "u1" }), manager({ id: "m2", name: "Beatriz", email: "beatriz@deep.com", linked_user_id: null })]}
        users={users}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Vincular Beatriz a usuário existente" }));
    fireEvent.click(screen.getAllByRole("combobox", { name: /Usuário para vincular a Beatriz/i })[0]);
    expect(await screen.findByRole("option", { name: "Bruno Lima" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Ana Souza" })).toBeNull();
  });
});
