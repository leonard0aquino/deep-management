import type { UserRole } from "@/lib/types/database";

export type AppCapability = "executive" | "operations" | "portfolio" | "tv" | "settings" | "admin";

const ROLE_CAPABILITIES: Record<UserRole, ReadonlySet<AppCapability>> = {
  admin: new Set(["executive", "operations", "portfolio", "tv", "settings", "admin"]),
  executivo: new Set(["executive", "portfolio", "tv", "settings"]),
  gerente: new Set(["operations", "portfolio"]),
  supervisor: new Set(["operations", "portfolio"]),
  analista: new Set(["operations", "portfolio"]),
};

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  executivo: "Executivo",
  gerente: "Gerente",
  supervisor: "Supervisor",
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

export function canManageOperations(role: UserRole) {
  return role === "admin" || role === "gerente" || role === "supervisor";
}
