import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  from: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  })),
}));

import { requireAdmin } from "@/lib/auth/require-admin";

describe("requireAdmin", () => {
  beforeEach(() => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: mocks.maybeSingle }),
      }),
    });
  });

  it("redireciona uma sessão ausente para o login", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    await expect(requireAdmin()).rejects.toThrow("redirect:/login");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each(["gerente", "analista", null])("redireciona o perfil %s para Meu dia", async (role) => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.maybeSingle.mockResolvedValue({ data: role ? { role } : null });

    await expect(requireAdmin()).rejects.toThrow("redirect:/my-day");
  });

  it("libera o acesso e reutiliza o cliente autenticado para admin", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    mocks.maybeSingle.mockResolvedValue({ data: { role: "admin" } });

    const result = await requireAdmin();

    expect(result.user.id).toBe("admin-1");
    expect(result.supabase.from).toBe(mocks.from);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
