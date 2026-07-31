import type { UserRole } from "@/lib/types/database";

export type AppCapability = "executive" | "operations" | "portfolio" | "tv" | "admin";

const ROLE_CAPABILITIES: Record<UserRole, ReadonlySet<AppCapability>> = {
  admin: new Set(["executive", "operations", "portfolio", "tv", "admin"]),
  executivo: new Set(["executive", "portfolio", "tv"]),
  gerente: new Set(["operations", "portfolio"]),
  analista: new Set(["operations", "portfolio"]),
};

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  executivo: "Executivo",
  gerente: "Gerente",
  analista: "Analista",
};

export function canAccess(role: UserRole, capability: AppCapability) {
  return ROLE_CAPABILITIES[role].has(capability);
}

export function defaultPathForRole(role: UserRole) {
  return canAccess(role, "executive") ? "/" : "/my-day";
}

export function hasFullPortfolioAccess(role: UserRole) {
  return role === "admin" || role === "executivo";
}
