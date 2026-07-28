import { authenticateApiRequest } from "@/lib/api/auth";
import { apiError, apiSuccess, pagination } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);
  const url = new URL(request.url);
  const { limit, offset } = pagination(url.searchParams);
  const search = url.searchParams.get("search")?.trim().slice(0, 120);
  let query = createAdminClient().from("clients")
    .select("id,name,segment,contract_value,contract_renewal_date,owner_manager_id,active,created_at", { count: "exact" })
    .eq("active", true).order("name").range(offset, offset + limit - 1);
  if (search) query = query.ilike("name", `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
  const { data, error, count } = await query;
  if (error) return apiError(500, "query_failed", "Não foi possível consultar os clientes.");
  return apiSuccess(data ?? [], 200, { limit, offset, total: count ?? 0 });
}
