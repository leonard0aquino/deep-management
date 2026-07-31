import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/auth/access-context", () => ({ requireAccess: mocks.requireAccess }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mocks.from })),
}));

import { requireAdmin } from "@/lib/auth/require-admin";

describe("requireAdmin", () => {
  beforeEach(() => {
    mocks.requireAccess.mockReset();
    mocks.requireAccess.mockResolvedValue({ userId: "admin-1", role: "admin", managerId: null });
  });

  it("exige a capacidade administrativa", async () => {
    await requireAdmin();
    expect(mocks.requireAccess).toHaveBeenCalledWith("admin");
  });

  it("reutiliza o contexto autorizado", async () => {
    const result = await requireAdmin();
    expect(result.user.id).toBe("admin-1");
    expect(result.context.role).toBe("admin");
    expect(result.supabase.from).toBe(mocks.from);
  });
});
