import { createClient } from "@supabase/supabase-js";
import type { DatabaseSchema } from "@/lib/types/database";

export function createAdminClient() {
  return createClient<DatabaseSchema>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
