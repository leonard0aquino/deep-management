"use server";

import { randomBytes, createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient as adminClient } from "@/lib/supabase/admin";

// Server Actions redigem qualquer erro lançado via `throw` em produção,
// substituindo a mensagem real por um texto genérico ("An error occurred in
// the Server Components render..."). Por isso essas actions retornam um
// resultado tipado em vez de lançar exceção — é a única forma de a mensagem
// real (ex.: "email rate limit exceeded") chegar até a UI.
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function currentRole(): Promise<string | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role ?? null;
}

// O link do e-mail de convite não tem para onde voltar (sem rota de
// callback de auth), então quem é convidado não consegue definir a
// própria senha por lá. Até essa rota existir, todo usuário novo já
// nasce com essa senha padrão — precisa ser trocada depois em
// Configurações > Perfil.
const DEFAULT_USER_PASSWORD = process.env.DEFAULT_USER_PASSWORD!;

export async function inviteUser(email: string): Promise<ActionResult> {
  const role = await currentRole();
  if (role !== "admin" && role !== "gerente") {
    return { ok: false, error: "Apenas administradores ou gerentes podem executar esta ação." };
  }

  const supabase = adminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);
  if (error) return { ok: false, error: error.message };
  if (data.user) {
    const { error: passwordError } = await supabase.auth.admin.updateUserById(data.user.id, {
      password: DEFAULT_USER_PASSWORD,
    });
    if (passwordError) return { ok: false, error: passwordError.message };
  }

  revalidatePath("/admin");
  return { ok: true, data: undefined };
}

export async function inviteManagerAsUser(managerId: string, email: string, name: string): Promise<ActionResult> {
  const role = await currentRole();
  if (role !== "admin" && role !== "gerente") {
    return { ok: false, error: "Apenas administradores ou gerentes podem executar esta ação." };
  }

  const supabase = adminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "Convite enviado, mas o usuário não foi retornado pelo Supabase." };

  const { error: passwordError } = await supabase.auth.admin.updateUserById(data.user.id, {
    password: DEFAULT_USER_PASSWORD,
  });
  if (passwordError) return { ok: false, error: passwordError.message };

  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({ name, role: "gerente" })
    .eq("id", data.user.id);
  if (profileError) return { ok: false, error: profileError.message };

  const { error: linkError } = await supabase
    .from("deep_managers")
    .update({ linked_user_id: data.user.id })
    .eq("id", managerId);
  if (linkError) return { ok: false, error: linkError.message };

  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function generateApiKey(label: string): Promise<ActionResult<string>> {
  const role = await currentRole();
  if (role !== "admin") {
    return { ok: false, error: "Apenas administradores podem executar esta ação." };
  }

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
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true, data: rawKey };
}
