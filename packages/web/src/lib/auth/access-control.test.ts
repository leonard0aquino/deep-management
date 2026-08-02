import { describe, expect, it } from "vitest";
import { canAccess, canManageOperations, defaultPathForRole } from "@/lib/auth/access-control";

describe("matriz de acesso", () => {
  it("concede todas as capacidades ao admin", () => {
    expect(["executive", "operations", "portfolio", "tv", "settings", "admin"].every((capability) =>
      canAccess("admin", capability as Parameters<typeof canAccess>[1]),
    )).toBe(true);
  });

  it("limita executivo às visões estratégicas e carteira", () => {
    expect(canAccess("executivo", "executive")).toBe(true);
    expect(canAccess("executivo", "portfolio")).toBe(true);
    expect(canAccess("executivo", "tv")).toBe(true);
    expect(canAccess("executivo", "settings")).toBe(true);
    expect(canAccess("executivo", "operations")).toBe(false);
    expect(canAccess("executivo", "admin")).toBe(false);
  });

  it.each(["gerente", "supervisor", "analista"] as const)("limita %s à operação e carteira", (role) => {
    expect(canAccess(role, "operations")).toBe(true);
    expect(canAccess(role, "portfolio")).toBe(true);
    expect(canAccess(role, "executive")).toBe(false);
    expect(canAccess(role, "settings")).toBe(false);
    expect(canAccess(role, "admin")).toBe(false);
  });

  it("define a entrada de acordo com o papel", () => {
    expect(defaultPathForRole("admin")).toBe("/");
    expect(defaultPathForRole("executivo")).toBe("/");
    expect(defaultPathForRole("gerente")).toBe("/my-day");
    expect(defaultPathForRole("supervisor")).toBe("/my-day");
    expect(defaultPathForRole("analista")).toBe("/my-day");
  });

  it("permite gestão operacional a Admin, Gerente e Supervisor", () => {
    expect(canManageOperations("admin")).toBe(true);
    expect(canManageOperations("gerente")).toBe(true);
    expect(canManageOperations("supervisor")).toBe(true);
    expect(canManageOperations("executivo")).toBe(false);
    expect(canManageOperations("analista")).toBe(false);
  });
});
