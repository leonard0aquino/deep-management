import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UsersManagement } from "@/components/dashboard/settings/users-management";
import type { UserProfile } from "@/lib/types/database";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(app)/admin/actions", () => ({ inviteUser: vi.fn() }));

const eq = vi.fn();
const update = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ update }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));

const profiles: UserProfile[] = [
  { id: "u1", name: "Alice", role: "analista", created_at: "2026-01-01" },
];

describe("UsersManagement", () => {
  beforeEach(() => { from.mockClear(); update.mockClear(); eq.mockReset(); eq.mockResolvedValue({ error: null }); });
  afterEach(() => { cleanup(); document.body.innerHTML = ""; });

  it("promove um usuário para Gerente", async () => {
    render(<UsersManagement profiles={profiles} viewerRole="admin" />);
    fireEvent.click(screen.getAllByRole("combobox", { name: /Papel de Alice/i })[0]);
    const option = await screen.findByRole("option", { name: /Gerente/i });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ role: "gerente" }));
    expect(eq).toHaveBeenCalledWith("id", "u1");
  });

  it("exibe erro quando a atualização de papel falha", async () => {
    eq.mockResolvedValue({ error: { message: "sem permissão" } });
    render(<UsersManagement profiles={profiles} viewerRole="admin" />);
    fireEvent.click(screen.getAllByRole("combobox", { name: /Papel de Alice/i })[0]);
    const option = await screen.findByRole("option", { name: /Admin/i });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/sem permissão/));
  });

  it("gerente não vê a opção Admin no seletor de papel", async () => {
    render(<UsersManagement profiles={profiles} viewerRole="gerente" />);
    fireEvent.click(screen.getAllByRole("combobox", { name: /Papel de Alice/i })[0]);
    expect(await screen.findByRole("option", { name: /Analista/i })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /^Admin$/i })).toBeNull();
  });

  it("gerente não pode alterar o papel de um usuário que já é admin", () => {
    const withAdmin: UserProfile[] = [{ id: "u2", name: "Bea", role: "admin", created_at: "2026-01-01" }];
    render(<UsersManagement profiles={withAdmin} viewerRole="gerente" />);
    expect(screen.getByText("Somente admin altera")).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: /Papel de Bea/i })).toBeNull();
  });
});
