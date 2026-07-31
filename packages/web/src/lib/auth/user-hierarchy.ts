import type { UserProfile, UserRole } from "@/lib/types/database";

type HierarchyProfile = Pick<UserProfile, "id" | "role" | "manager_user_id">;

export const ALLOWED_MANAGER_ROLES: Record<UserRole, UserRole[]> = {
  admin: [],
  executivo: [],
  gerente: ["executivo"],
  supervisor: ["gerente"],
  analista: ["supervisor", "gerente"],
};

export function leaderCandidates<T extends HierarchyProfile>(profile: T, profiles: T[]) {
  const allowedRoles = ALLOWED_MANAGER_ROLES[profile.role];
  return profiles.filter((candidate) => candidate.id !== profile.id && allowedRoles.includes(candidate.role));
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
