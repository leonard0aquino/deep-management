import { authenticateApiRequest } from "@/lib/api/auth";
import { apiError, apiSuccess, readJson, validIsoDate } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);
  const parsed = await readJson(request);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return apiError(400, "invalid_json", "Envie um objeto JSON válido.");
  const body = parsed.value as Record<string, unknown>;
  const required = ["action_key", "client_id", "product_id", "priority", "reason", "due_date"];
  const missing = required.filter((field) => body[field] === undefined || String(body[field]).trim() === "");
  if (missing.length) return apiError(422, "validation_error", "Campos obrigatórios ausentes.", { fields: missing });
  if (!UUID.test(String(body.client_id)) || !UUID.test(String(body.product_id))) return apiError(422, "validation_error", "client_id e product_id devem ser UUIDs válidos.");
  if (!['alta', 'media'].includes(String(body.priority))) return apiError(422, "validation_error", "priority deve ser alta ou media.");
  if (!validIsoDate(body.due_date)) return apiError(422, "validation_error", "due_date deve ser uma data real no formato AAAA-MM-DD.");
  if (String(body.action_key).length > 200 || String(body.reason).length > 1000) return apiError(422, "validation_error", "action_key ou reason excede o limite permitido.");
  const payload = Object.fromEntries(Object.entries(body).filter(([key]) => required.includes(key) || ["status", "assigned_to", "justification", "result"].includes(key)));
  const { data, error } = await createAdminClient().rpc("api_create_action", { p_api_key_id: auth.apiKeyId, p_payload: payload });
  if (error) return apiError(error.code === "23505" ? 409 : 422, error.code === "23505" ? "duplicate_action" : "write_failed", "Não foi possível criar a ação.");
  return apiSuccess(data, 201);
}
