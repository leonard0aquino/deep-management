import type { UserProfile, UserRole } from "@/lib/types/database";

type HierarchyProfile = Pick<UserProfile, "id" | "role" | "manager_user_id">;

export const REQUIRED_MANAGER_ROLE: Record<UserRole, UserRole | null> = {
  admin: null,
  executivo: null,
  gerente: "executivo",
  supervisor: "gerente",
  analista: "supervisor",
};

export function leaderCandidates<T extends HierarchyProfile>(profile: T, profiles: T[]) {
  const requiredRole = REQUIRED_MANAGER_ROLE[profile.role];
  if (!requiredRole) return [];
  return profiles.filter((candidate) => candidate.id !== profile.id && candidate.role === requiredRole);
}

export function hierarchyUserIds(userId: string, profiles: HierarchyProfile[]) {
  const visible = new Set([userId]);
  let added = true;

  while (added) {
    added = false;
    for (const profile of profiles) {
      if (profile.manager_user_id && visible.has(profile.manager_user_id) && !visible.has(profile.id)) {
        visible.add(profile.id);
        added = true;
      }
    }
  }

  return visible;
}
