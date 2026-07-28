import { authenticateApiRequest } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);
  const clientId = new URL(request.url).searchParams.get("client_id");
  let query = createAdminClient().from("client_health").select("*").order("score", { ascending: true }).limit(500);
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) return apiError(500, "query_failed", "Não foi possível consultar o Health Score.");
  return apiSuccess(data ?? []);
}
