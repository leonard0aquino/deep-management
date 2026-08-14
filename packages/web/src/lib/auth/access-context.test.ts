import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profiles: vi.fn(),
  managers: vi.fn(),
  redirect: vi.fn((destination: string) => { throw new Error(`redirect:${destination}`); }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: (table: string) => {
      const result = table === "user_profiles" ? mocks.profiles : mocks.managers;
      const query = {
        select: () => query,
        eq: () => query,
        returns: result,
      };
      return query;
    },
  })),
}));

describe("proteção de rotas", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getUser.mockReset();
    mocks.profiles.mockReset();
    mocks.managers.mockReset();
    mocks.redirect.mockClear();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.profiles.mockResolvedValue({ data: [] });
    mocks.managers.mockResolvedValue({ data: [{ id: "m1", linked_user_id: "u1" }] });
  });

  it("redireciona sessão ausente para login", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const { requireAccess } = await import("@/lib/auth/access-context");
    await expect(requireAccess("portfolio")).rejects.toThrow("redirect:/login");
  });

  it("redireciona gerente de visão executiva para Meu dia", async () => {
    mocks.profiles.mockResolvedValue({ data: [{ id: "u1", role: "gerente", business_area: "customer_success", manager_user_id: null }] });
    const { requireAccess } = await import("@/lib/auth/access-context");
    await expect(requireAccess("executive")).rejects.toThrow("redirect:/my-day");
  });

  it.each(["gerente", "supervisor"] as const)("libera o Modo TV para %s", async (role) => {
    mocks.profiles.mockResolvedValue({ data: [{ id: "u1", role, business_area: "customer_success", manager_user_id: null }] });
    const { requireAccess } = await import("@/lib/auth/access-context");
    await expect(requireAccess("tv")).resolves.toMatchObject({ userId: "u1", role });
  });

  it("mantém o Modo TV bloqueado para analista", async () => {
    mocks.profiles.mockResolvedValue({ data: [{ id: "u1", role: "analista", business_area: "customer_success", manager_user_id: null }] });
    const { requireAccess } = await import("@/lib/auth/access-context");
    await expect(requireAccess("tv")).rejects.toThrow("redirect:/my-day");
  });

  it("redireciona executivo de configurações para o Cockpit", async () => {
    mocks.profiles.mockResolvedValue({ data: [{ id: "u1", role: "executivo", business_area: "customer_success", manager_user_id: null }] });
    const { requireAccess } = await import("@/lib/auth/access-context");
    await expect(requireAccess("admin")).rejects.toThrow("redirect:/");
  });

  it("permite ao executivo consultar configurações sem conceder administração", async () => {
    mocks.profiles.mockResolvedValue({ data: [{ id: "u1", role: "executivo", business_area: "customer_success", manager_user_id: null }] });
    const { requireAccess } = await import("@/lib/auth/access-context");
    await expect(requireAccess("settings")).resolves.toEqual({ userId: "u1", role: "executivo", businessArea: "customer_success", commercialAccess: false, managerIds: ["m1"] });
  });

  it("retorna papel e responsável quando a capacidade é permitida", async () => {
    mocks.profiles.mockResolvedValue({ data: [{ id: "u1", role: "analista", business_area: "customer_success", manager_user_id: null }] });
    const { requireAccess } = await import("@/lib/auth/access-context");
    await expect(requireAccess("portfolio")).resolves.toEqual({ userId: "u1", role: "analista", businessArea: "customer_success", commercialAccess: false, managerIds: ["m1"] });
  });

  it("inclui os responsáveis de toda a estrutura do Gerente", async () => {
    mocks.profiles.mockResolvedValue({ data: [
      { id: "u1", role: "gerente", business_area: "commercial", manager_user_id: "exec" },
      { id: "u2", role: "supervisor", business_area: "commercial", manager_user_id: "u1" },
      { id: "u3", role: "analista", business_area: "commercial", manager_user_id: "u2" },
      { id: "u4", role: "analista", business_area: "customer_success", manager_user_id: "u1" },
    ] });
    mocks.managers.mockResolvedValue({ data: [
      { id: "m1", linked_user_id: "u1" },
      { id: "m2", linked_user_id: "u2" },
      { id: "m3", linked_user_id: "u3" },
      { id: "m4", linked_user_id: "u4" },
    ] });
    const { requireAccess } = await import("@/lib/auth/access-context");
    await expect(requireAccess("portfolio")).resolves.toEqual({
      userId: "u1", role: "gerente", businessArea: "commercial", commercialAccess: false, managerIds: ["m1", "m2", "m3"],
    });
  });

  it("permite capacidade Comercial somente à área Comercial ou visão transversal", async () => {
    mocks.profiles.mockResolvedValue({ data: [{ id: "u1", role: "analista", business_area: "commercial", manager_user_id: null }] });
    const { requireAccess } = await import("@/lib/auth/access-context");
    await expect(requireAccess("commercial")).resolves.toMatchObject({ businessArea: "commercial" });
  });

  it("concede Comercial adicional sem substituir a área e as permissões atuais", async () => {
    mocks.profiles.mockResolvedValue({ data: [{ id: "u1", role: "gerente", business_area: "customer_success", commercial_access: true, manager_user_id: null }] });
    const { requireAccess } = await import("@/lib/auth/access-context");

    await expect(requireAccess("commercial")).resolves.toMatchObject({
      userId: "u1",
      role: "gerente",
      businessArea: "customer_success",
      commercialAccess: true,
    });
  });
});
