import { authenticateApiRequest } from "@/lib/api/auth";
import { apiError, apiSuccess, readJson, validIsoDate } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED = new Set(["priority", "reason", "status", "assigned_to", "due_date", "justification", "result"]);
const STATUSES = new Set(["pending", "in_progress", "completed", "postponed", "dismissed"]);

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);
  const { id } = await context.params;
  if (!UUID.test(id)) return apiError(400, "invalid_id", "ID de ação inválido.");
  const parsed = await readJson(request);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return apiError(400, "invalid_json", "Envie um objeto JSON válido.");
  const body = parsed.value as Record<string, unknown>;
  const disallowed = Object.keys(body).filter((key) => !ALLOWED.has(key));
  if (disallowed.length) return apiError(422, "immutable_field", "Há campos não editáveis na solicitação.", { fields: disallowed });
  if (body.status !== undefined && !STATUSES.has(String(body.status))) return apiError(422, "validation_error", "Status inválido.");
  if (body.priority !== undefined && !["alta", "media"].includes(String(body.priority))) return apiError(422, "validation_error", "Prioridade inválida.");
  if (body.due_date !== undefined && !validIsoDate(body.due_date)) return apiError(422, "validation_error", "due_date deve ser uma data real no formato AAAA-MM-DD.");
  const { data, error } = await createAdminClient().rpc("api_update_action", { p_api_key_id: auth.apiKeyId, p_action_id: id, p_payload: body });
  if (error?.code === "P0002") return apiError(404, "not_found", "Ação não encontrada.");
  if (error) return apiError(422, "write_failed", "Não foi possível atualizar a ação.");
  return apiSuccess(data);
}
