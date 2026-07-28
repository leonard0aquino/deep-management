import { authenticateApiRequest } from "@/lib/api/auth";
import { apiError, apiSuccess, readJson } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);
  const bodyResult = await readJson(request, 512_000);
  if (!bodyResult.ok || !bodyResult.value || typeof bodyResult.value !== "object" || Array.isArray(bodyResult.value)) return apiError(400, "invalid_json", "Envie um objeto JSON válido.");
  const body = bodyResult.value as Record<string, unknown>;
  const source = typeof body.source === "string" ? body.source.trim() : "";
  const eventType = typeof body.event_type === "string" ? body.event_type.trim() : "";
  const externalKey = typeof body.external_key === "string" ? body.external_key.trim() : "";
  const payload = body.payload;
  if (source.length < 2 || source.length > 80 || eventType.length < 2 || eventType.length > 120 || externalKey.length < 1 || externalKey.length > 200 || !payload || typeof payload !== "object" || Array.isArray(payload)) {
    return apiError(422, "validation_error", "source, event_type, external_key e payload são obrigatórios e devem respeitar os limites documentados.");
  }
  const admin = createAdminClient();
  const { data: existing } = await admin.from("internal_api_events").select("id,received_at").eq("source", source).eq("external_key", externalKey).maybeSingle();
  if (existing) return apiSuccess({ ...existing, duplicate: true }, 200);
  const { data, error } = await admin.from("internal_api_events").insert({ source, event_type: eventType, external_key: externalKey, payload: payload as Record<string, unknown>, api_key_id: auth.apiKeyId }).select("id,received_at").single();
  if (error?.code === "23505") {
    const { data: raced } = await admin.from("internal_api_events").select("id,received_at").eq("source", source).eq("external_key", externalKey).single();
    return apiSuccess({ ...raced, duplicate: true }, 200);
  }
  if (error) return apiError(500, "write_failed", "Não foi possível registrar o evento.");
  return apiSuccess({ ...data, duplicate: false }, 202);
}
