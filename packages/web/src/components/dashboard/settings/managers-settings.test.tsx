import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ManagersSettings } from "@/components/dashboard/settings/managers-settings";
import type { DeepManager } from "@/lib/types/database";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const inviteManagerAsUser = vi.fn();
vi.mock("@/app/(app)/admin/actions", () => ({ inviteManagerAsUser: (...args: unknown[]) => inviteManagerAsUser(...args) }));

const eq = vi.fn();
const remove = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ delete: remove }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));

function manager(overrides: Partial<DeepManager>): DeepManager {
  return {
    id: "m1", name: "Carlos", email: "carlos@deep.com", avatar_color: null,
    active: true, linked_user_id: null, created_at: "2026-01-01",
    ...overrides,
  };
}

describe("ManagersSettings", () => {
  beforeEach(() => { from.mockClear(); remove.mockClear(); eq.mockReset(); eq.mockResolvedValue({ error: null }); inviteManagerAsUser.mockReset(); });
  afterEach(() => { cleanup(); document.body.innerHTML = ""; });

  it("exige confirmação antes de excluir um gestor", async () => {
    render(<ManagersSettings managers={[manager({})]} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir Carlos" }));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(eq).toHaveBeenCalledWith("id", "m1");
  });

  it("mostra 'Sem login' e permite convidar como usuário", async () => {
    render(<ManagersSettings managers={[manager({})]} />);
    expect(screen.getByText("Sem login")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Convidar Carlos como usuário" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar convite" }));
    await waitFor(() => expect(inviteManagerAsUser).toHaveBeenCalledWith("m1", "carlos@deep.com", "Carlos"));
  });

  it("mostra 'Conta vinculada' quando já há linked_user_id", () => {
    render(<ManagersSettings managers={[manager({ linked_user_id: "u9" })]} />);
    expect(screen.getByText("Conta vinculada")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Convidar Carlos como usuário" })).toBeNull();
  });
});
