import { authenticateApiRequest } from "@/lib/api/auth";
import { apiError, apiSuccess, pagination } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);
  const url = new URL(request.url);
  const { limit, offset } = pagination(url.searchParams);
  const clientId = url.searchParams.get("client_id");
  const search = url.searchParams.get("search")?.trim().slice(0, 120);
  let query = createAdminClient().from("client_contacts")
    .select("id,client_id,name,role,email,phone,influence,relationship_role,owner_manager_id,created_at", { count: "exact" })
    .order("name").range(offset, offset + limit - 1);
  if (clientId) query = query.eq("client_id", clientId);
  if (search) query = query.ilike("name", `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
  const { data, error, count } = await query;
  if (error) return apiError(500, "query_failed", "Não foi possível consultar as pessoas.");
  return apiSuccess(data ?? [], 200, { limit, offset, total: count ?? 0 });
}
