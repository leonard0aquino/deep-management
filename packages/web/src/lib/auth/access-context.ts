import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DeepManager, UserProfile, UserRole } from "@/lib/types/database";
import { canAccess, defaultPathForRole, type AppCapability } from "@/lib/auth/access-control";

export type AccessContext = {
  userId: string;
  role: UserRole;
  managerId: string | null;
};

export const getAccessContext = cache(async (): Promise<AccessContext> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: manager }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<Pick<UserProfile, "role">>(),
    supabase
      .from("deep_managers")
      .select("id")
      .eq("linked_user_id", user.id)
      .eq("active", true)
      .maybeSingle<Pick<DeepManager, "id">>(),
  ]);

  return {
    userId: user.id,
    role: profile?.role ?? "analista",
    managerId: manager?.id ?? null,
  };
});

export async function requireAccess(capability: AppCapability) {
  const context = await getAccessContext();
  if (!canAccess(context.role, capability)) redirect(defaultPathForRole(context.role));
  return context;
}
