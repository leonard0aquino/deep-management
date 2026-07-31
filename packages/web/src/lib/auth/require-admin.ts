import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/lib/auth/access-context";

export async function requireAdmin() {
  const context = await requireAccess("admin");
  const supabase = await createClient();
  return { supabase, user: { id: context.userId }, context };
}
