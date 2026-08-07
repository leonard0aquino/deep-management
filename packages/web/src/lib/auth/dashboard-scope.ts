import type { AccessContext } from "@/lib/auth/access-context";
import { hasFullPortfolioAccess } from "@/lib/auth/access-control";
import type { DashboardData } from "@/lib/data";
import type { ClientHealth, HealthScore } from "@/lib/types/database";

const comboKey = (clientId: string, productId: string) => `${clientId}::${productId}`;

function scopedHealth(data: DashboardData["matrix"]): { healthScore: HealthScore; clientHealth: ClientHealth[] } {
  const byClient = new Map<string, DashboardData["matrix"]>();
  for (const row of data) byClient.set(row.client_id, [...(byClient.get(row.client_id) ?? []), row]);

  return {
    healthScore: {
      score: data.length ? Math.round(data.reduce((sum, row) => sum + row.composite_score, 0) / data.length) : 0,
      critical_count: data.filter((row) => row.status === "critico").length,
      tracked_combinations: data.length,
    },
    clientHealth: [...byClient.entries()].map(([clientId, rows]) => ({
      client_id: clientId,
      client_name: rows[0]?.client_name ?? "",
      score: Math.round(rows.reduce((sum, row) => sum + row.composite_score, 0) / rows.length),
      days_since_last_contact: Math.min(...rows.map((row) => row.days_since_contact)),
      tracked_products: rows.length,
      critical_products: rows.filter((row) => row.status === "critico").length,
    })),
  };
}

export function scopeDashboardData(data: DashboardData, context: AccessContext): DashboardData {
  if (hasFullPortfolioAccess(context.role)) return data;

  const managerIds = new Set(context.managerIds);
  const activeOwners = data.clientProductOwners.filter((item) => item.active);
  const authorizedAssignmentIds = new Set(
    activeOwners.filter((item) => managerIds.has(item.manager_id)).map((item) => item.client_product_id),
  );
  const useLegacyOwnership = activeOwners.length === 0;
  const assignments = data.clientProducts.filter((item) =>
    useLegacyOwnership
      ? Boolean(item.owner_manager_id && managerIds.has(item.owner_manager_id))
      : authorizedAssignmentIds.has(item.id),
  );
  const assignmentIds = new Set(assignments.map((item) => item.id));
  const visibleOwners = activeOwners.filter((item) => assignmentIds.has(item.client_product_id));
  const visibleManagerIds = new Set([
    ...context.managerIds,
    ...visibleOwners.map((item) => item.manager_id),
  ]);
  const allowedCombos = new Set(assignments.map((item) => comboKey(item.client_id, item.product_id)));
  const clientIds = new Set(assignments.map((item) => item.client_id));
  const productIds = new Set(assignments.map((item) => item.product_id));
  const matrix = data.matrix.filter((item) => allowedCombos.has(comboKey(item.client_id, item.product_id)));
  const health = scopedHealth(matrix);

  return {
    ...data,
    interactions: data.interactions.filter((item) =>
      allowedCombos.has(comboKey(item.client_id, item.product_id))
      || item.created_by === context.userId
      || Boolean(item.manager_id && managerIds.has(item.manager_id)),
    ),
    matrix,
    healthScore: health.healthScore,
    clientHealth: health.clientHealth,
    stakeholders: data.stakeholders.filter((item) => clientIds.has(item.client_id)),
    clients: data.clients.filter((item) => clientIds.has(item.id)),
    products: data.products.filter((item) => productIds.has(item.id)),
    managers: data.managers.filter((item) => visibleManagerIds.has(item.id)),
    contacts: data.contacts.filter((item) => clientIds.has(item.client_id)),
    clientProducts: assignments,
    clientProductOwners: visibleOwners,
    commercialPlans: data.commercialPlans.filter((item) => clientIds.has(item.client_id)),
    cadences: data.cadences.filter((item) => allowedCombos.has(comboKey(item.client_id, item.product_id))),
  };
}
