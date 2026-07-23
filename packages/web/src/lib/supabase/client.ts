import { createBrowserClient } from "@supabase/ssr";
import type { DatabaseSchema } from "@/lib/types/database";

export function createClient() {
  return createBrowserClient<DatabaseSchema>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
