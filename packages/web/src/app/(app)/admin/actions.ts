"use server";

import { randomBytes, createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { DatabaseSchema } from "@/lib/types/database";

function adminClient() {
  return createSupabaseJsClient<DatabaseSchema>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function assertIsAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Apenas administradores podem executar esta ação.");
}

export async function inviteUser(email: string) {
  await assertIsAdmin();

  const supabase = adminClient();
  const { error } = await supabase.auth.admin.inviteUserByEmail(email);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function generateApiKey(label: string): Promise<string> {
  await assertIsAdmin();

  const serverSupabase = await createServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  const rawKey = `deep_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12);

  const { error } = await serverSupabase.from("api_keys").insert({
    label,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  return rawKey;
}
