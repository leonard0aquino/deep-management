import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UsersManagement } from "@/components/dashboard/settings/users-management";
import type { UserProfile } from "@/lib/types/database";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(app)/admin/actions", () => ({ inviteUser: vi.fn() }));

const eq = vi.fn();
const update = vi.fn(() => ({ eq }));
const upsert = vi.fn(() => Promise.resolve({ error: null }));
const from = vi.fn(() => ({ update, upsert }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));

const profiles: UserProfile[] = [
  { id: "u1", name: "Alice", role: "analista", business_area: "customer_success", manager_user_id: null, created_at: "2026-01-01" },
  { id: "u2", name: "Eduardo", role: "executivo", business_area: "customer_success", manager_user_id: null, created_at: "2026-01-01" },
  { id: "u3", name: "Gisele", role: "gerente", business_area: "customer_success", manager_user_id: "u2", created_at: "2026-01-01" },
  { id: "u4", name: "Sofia", role: "supervisor", business_area: "customer_success", manager_user_id: "u3", created_at: "2026-01-01" },
  { id: "u5", name: "Letícia", role: "analista", business_area: "commercial", manager_user_id: null, created_at: "2026-01-01" },
];

describe("UsersManagement", () => {
  beforeEach(() => { from.mockClear(); update.mockClear(); upsert.mockClear(); eq.mockReset(); eq.mockResolvedValue({ error: null }); });
  afterEach(() => { cleanup(); document.body.innerHTML = ""; });

  it("promove um usuário para Gerente", async () => {
    render(<UsersManagement profiles={profiles} commercialStageScopes={[]} viewerRole="admin" />);
    fireEvent.click(screen.getAllByRole("combobox", { name: /Papel de Alice/i })[0]);
    const option = await screen.findByRole("option", { name: /Gerente/i });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ role: "gerente", manager_user_id: null }));
    expect(eq).toHaveBeenCalledWith("id", "u1");
  });

  it("exibe erro quando a atualização de papel falha", async () => {
    eq.mockResolvedValue({ error: { message: "sem permissão" } });
    render(<UsersManagement profiles={profiles} commercialStageScopes={[]} viewerRole="admin" />);
    fireEvent.click(screen.getAllByRole("combobox", { name: /Papel de Alice/i })[0]);
    const option = await screen.findByRole("option", { name: /Admin/i });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/sem permissão/));
  });

  it("admin pode atribuir o papel Executivo", async () => {
    render(<UsersManagement profiles={profiles} commercialStageScopes={[]} viewerRole="admin" />);
    fireEvent.click(screen.getAllByRole("combobox", { name: /Papel de Alice/i })[0]);
    const option = await screen.findByRole("option", { name: /Executivo/i });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ role: "executivo", manager_user_id: null }));
  });

  it("admin pode atribuir o papel Supervisor", async () => {
    render(<UsersManagement profiles={profiles} commercialStageScopes={[]} viewerRole="admin" />);
    fireEvent.click(screen.getByRole("combobox", { name: /Papel de Alice/i }));
    const option = await screen.findByRole("option", { name: /^SupervisorOpera/i });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ role: "supervisor", manager_user_id: null }));
  });

  it("admin classifica o usuário como Comercial sem alterar o papel", async () => {
    render(<UsersManagement profiles={profiles} commercialStageScopes={[]} viewerRole="admin" />);
    fireEvent.click(screen.getByRole("combobox", { name: /Área de Alice/i }));
    const option = await screen.findByRole("option", { name: "Comercial" });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ business_area: "commercial" }));
    expect(eq).toHaveBeenCalledWith("id", "u1");
  });

  it("permite vincular Analista a Supervisor ou Gerente", async () => {
    render(<UsersManagement profiles={profiles} commercialStageScopes={[]} viewerRole="admin" />);
    fireEvent.click(screen.getByRole("combobox", { name: /Líder de Alice/i }));
    expect(await screen.findByRole("option", { name: "Sofia" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Gisele" })).toBeTruthy();
    const option = screen.getByRole("option", { name: "Gisele" });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ manager_user_id: "u3" }));
  });

  it("explica quando não existe líder compatível sem exibir o valor técnico", async () => {
    const profilesWithoutLeaders = profiles.filter((profile) => !["supervisor", "gerente"].includes(profile.role));
    render(<UsersManagement profiles={profilesWithoutLeaders} commercialStageScopes={[]} viewerRole="admin" />);

    const leaderSelect = screen.getByRole("combobox", { name: /Líder de Alice/i });
    expect(leaderSelect.textContent).toContain("Não definido");
    expect(leaderSelect.textContent).not.toContain("__unassigned__");

    fireEvent.click(leaderSelect);
    expect(await screen.findByRole("option", { name: "Nenhum Supervisor ou Gerente disponível" })).toBeTruthy();
  });

  it("admin configura múltiplas etapas do usuário Comercial", async () => {
    render(<UsersManagement profiles={profiles} commercialStageScopes={[]} viewerRole="admin" />);

    const prospecting = screen.getByRole("checkbox", { name: "Prospecção de Letícia" });
    const ndaPoc = screen.getByRole("checkbox", { name: "NDA / POC de Letícia" });
    fireEvent.click(prospecting);
    fireEvent.click(ndaPoc);

    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(2));
    expect(upsert).toHaveBeenNthCalledWith(1, {
      owner_user_id: "u5", stage: "prospecting", active: true,
    }, { onConflict: "owner_user_id,stage" });
    expect(upsert).toHaveBeenNthCalledWith(2, {
      owner_user_id: "u5", stage: "nda_poc", active: true,
    }, { onConflict: "owner_user_id,stage" });
  });
});
