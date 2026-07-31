import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  manager: vi.fn(),
  redirect: vi.fn((destination: string) => { throw new Error(`redirect:${destination}`); }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => {
      const result = table === "user_profiles" ? mocks.profile : mocks.manager;
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: result,
      };
      return query;
    },
  })),
}));

describe("proteção de rotas", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getUser.mockReset();
    mocks.profile.mockReset();
    mocks.manager.mockReset();
    mocks.redirect.mockClear();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.manager.mockResolvedValue({ data: { id: "m1" } });
  });

  it("redireciona sessão ausente para login", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const { requireAccess } = await import("@/lib/auth/access-context");
    await expect(requireAccess("portfolio")).rejects.toThrow("redirect:/login");
  });

  it("redireciona gerente de visão executiva para Meu dia", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "gerente" } });
    const { requireAccess } = await import("@/lib/auth/access-context");
    await expect(requireAccess("executive")).rejects.toThrow("redirect:/my-day");
  });

  it("redireciona executivo de configurações para o Cockpit", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "executivo" } });
    const { requireAccess } = await import("@/lib/auth/access-context");
    await expect(requireAccess("admin")).rejects.toThrow("redirect:/");
  });

  it("retorna papel e responsável quando a capacidade é permitida", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "analista" } });
    const { requireAccess } = await import("@/lib/auth/access-context");
    await expect(requireAccess("portfolio")).resolves.toEqual({ userId: "u1", role: "analista", managerId: "m1" });
  });
});
