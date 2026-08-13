import type { BusinessArea, UserRole } from "@/lib/types/database";

export type AppCapability = "executive" | "operations" | "portfolio" | "commercial" | "projects" | "tv" | "settings" | "admin";

const ROLE_CAPABILITIES: Record<UserRole, ReadonlySet<AppCapability>> = {
  admin: new Set(["executive", "operations", "portfolio", "projects", "tv", "settings", "admin"]),
  executivo: new Set(["executive", "portfolio", "projects", "tv", "settings"]),
  gerente: new Set(["operations", "portfolio", "projects", "tv"]),
  supervisor: new Set(["operations", "portfolio", "projects", "tv"]),
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
  if (capability === "commercial") return role === "admin" || role === "executivo";
  return ROLE_CAPABILITIES[role].has(capability);
}

export function canAccessForArea(role: UserRole, businessArea: BusinessArea, capability: AppCapability) {
  if (capability === "commercial") {
    return role === "admin" || role === "executivo" || businessArea === "commercial";
  }
  return canAccess(role, capability);
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
