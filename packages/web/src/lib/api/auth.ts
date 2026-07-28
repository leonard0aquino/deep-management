import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type ApiAuthResult = { ok: true; apiKeyId: string } | { ok: false; status: 401 | 503; code: string; message: string };

export function extractBearerToken(header: string | null) {
  const match = /^Bearer\s+(deep_[a-f0-9]{48})$/i.exec(header?.trim() ?? "");
  return match?.[1] ?? null;
}

export function hashApiKey(rawKey: string) {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function apiKeyRecordIsUsable(record: { id: string; revoked: boolean } | null | undefined): record is { id: string; revoked: false } {
  return Boolean(record && !record.revoked);
}

export async function authenticateApiRequest(request: Request): Promise<ApiAuthResult> {
  const rawKey = extractBearerToken(request.headers.get("authorization"));
  if (!rawKey) return { ok: false, status: 401, code: "invalid_api_key", message: "Chave de API ausente ou inválida." };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("api_keys")
    .select("id,revoked")
    .eq("key_hash", hashApiKey(rawKey))
    .maybeSingle();
  if (error || !apiKeyRecordIsUsable(data)) return { ok: false, status: 401, code: "invalid_api_key", message: "Chave de API ausente, inválida ou revogada." };
  const { error: updateError } = await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  if (updateError) return { ok: false, status: 503, code: "auth_unavailable", message: "Autenticação temporariamente indisponível." };
  return { ok: true, apiKeyId: data.id };
}
