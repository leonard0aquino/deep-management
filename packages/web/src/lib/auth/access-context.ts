import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BusinessArea, DeepManager, UserProfile, UserRole } from "@/lib/types/database";
import { canAccessForArea, defaultPathForRole, type AppCapability } from "@/lib/auth/access-control";
import { hierarchyUserIds } from "@/lib/auth/user-hierarchy";

export type AccessContext = {
  userId: string;
  role: UserRole;
  businessArea: BusinessArea;
  managerIds: string[];
};

export const getAccessContext = cache(async (): Promise<AccessContext> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const [{ data: profiles }, { data: managers }] = await Promise.all([
    admin
      .from("user_profiles")
      .select("id,role,business_area,manager_user_id")
      .returns<Array<Pick<UserProfile, "id" | "role" | "business_area" | "manager_user_id">>>(),
    admin
      .from("deep_managers")
      .select("id,linked_user_id")
      .eq("active", true)
      .returns<Array<Pick<DeepManager, "id" | "linked_user_id">>>(),
  ]);

  const profile = profiles?.find((item) => item.id === user.id);
  const role = profile?.role ?? "analista";
  const businessArea = profile?.business_area ?? "customer_success";
  const hierarchyProfiles = role === "admin" || role === "executivo"
    ? (profiles ?? [])
    : (profiles ?? []).filter((item) => item.business_area === businessArea);
  const visibleUserIds = hierarchyUserIds(user.id, hierarchyProfiles);
  const managerIds = (managers ?? [])
    .filter((manager) => manager.linked_user_id && visibleUserIds.has(manager.linked_user_id))
    .map((manager) => manager.id);

  return {
    userId: user.id,
    role,
    businessArea,
    managerIds,
  };
});

export async function requireAccess(capability: AppCapability) {
  const context = await getAccessContext();
  if (!canAccessForArea(context.role, context.businessArea, capability)) redirect(defaultPathForRole(context.role));
  return context;
}
