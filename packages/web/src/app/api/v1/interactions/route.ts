import { authenticateApiRequest } from "@/lib/api/auth";
import { apiError, apiSuccess, readJson, validIsoDate } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { businessDateIso } from "@/lib/local-date";
import type { InteractionType } from "@/lib/types/database";

const TYPES = new Set<InteractionType>(["meeting", "call", "email", "whatsapp", "ticket", "demo", "implantacao", "treinamento", "incidente", "encerramento", "other"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);
  const bodyResult = await readJson(request);
  if (!bodyResult.ok || !bodyResult.value || typeof bodyResult.value !== "object" || Array.isArray(bodyResult.value)) return apiError(400, "invalid_json", "Envie um objeto JSON válido.");
  const body = bodyResult.value as Record<string, unknown>;
  const required = ["client_id", "product_id", "interaction_type", "topic", "relevance", "occurred_at"];
  const missing = required.filter((field) => body[field] === undefined || body[field] === null || body[field] === "");
  if (missing.length) return apiError(422, "validation_error", "Campos obrigatórios ausentes.", { fields: missing });
  if (!UUID.test(String(body.client_id)) || !UUID.test(String(body.product_id))) return apiError(422, "validation_error", "client_id e product_id devem ser UUIDs válidos.");
  if (!TYPES.has(String(body.interaction_type) as InteractionType)) return apiError(422, "validation_error", "Tipo de interação inválido.");
  if (!Number.isInteger(body.relevance) || Number(body.relevance) < 1 || Number(body.relevance) > 5) return apiError(422, "validation_error", "A relevância deve ser um inteiro entre 1 e 5.");
  if (!validIsoDate(body.occurred_at)) return apiError(422, "validation_error", "occurred_at deve ser uma data real no formato AAAA-MM-DD.");
  if (String(body.occurred_at) > businessDateIso()) return apiError(422, "validation_error", "occurred_at não pode estar no futuro.");
  if (typeof body.topic !== "string" || body.topic.trim().length < 2 || body.topic.length > 200) return apiError(422, "validation_error", "O tópico deve ter entre 2 e 200 caracteres.");

  const admin = createAdminClient();
  const [client, product, manager, contact] = await Promise.all([
    admin.from("clients").select("id").eq("id", String(body.client_id)).eq("active", true).maybeSingle(),
    admin.from("products").select("id").eq("id", String(body.product_id)).eq("active", true).maybeSingle(),
    typeof body.manager_id === "string" && UUID.test(body.manager_id)
      ? admin.from("deep_managers").select("id").eq("id", body.manager_id).eq("active", true).maybeSingle()
      : Promise.resolve({ data: body.manager_id ? null : { id: null }, error: null }),
    typeof body.contact_id === "string" && UUID.test(body.contact_id)
      ? admin.from("client_contacts").select("id").eq("id", body.contact_id).eq("client_id", String(body.client_id)).maybeSingle()
      : Promise.resolve({ data: body.contact_id ? null : { id: null }, error: null }),
  ]);
  if (!client.data || !product.data || !manager.data || !contact.data) return apiError(422, "unresolved_reference", "Cliente, produto, responsável ou contato não encontrado/ativo para a relação informada.");
  const { data, error } = await admin.from("interactions").insert({
    client_id: String(body.client_id), product_id: String(body.product_id),
    manager_id: typeof body.manager_id === "string" && UUID.test(body.manager_id) ? body.manager_id : null,
    contact_id: typeof body.contact_id === "string" && UUID.test(body.contact_id) ? body.contact_id : null,
    interaction_type: body.interaction_type as InteractionType, topic: body.topic.trim(),
    notes: typeof body.notes === "string" ? body.notes.slice(0, 10_000) : null,
    relevance: Number(body.relevance), occurred_at: String(body.occurred_at),
    links: [], additional_participants: [], confidential: false,
  }).select("id,created_at").single();
  if (error) return apiError(422, "write_failed", "Não foi possível criar a interação.");
  return apiSuccess(data, 201);
}
