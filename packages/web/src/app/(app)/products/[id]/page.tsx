import { notFound } from "next/navigation";
import { Rocket, AlertTriangle, TrendingUp } from "lucide-react";
import { getAuthorizedDashboardData } from "@/lib/data";
import { requireAccess } from "@/lib/auth/access-context";
import { createClient } from "@/lib/supabase/server";
import { detectCrossSellOpportunities } from "@/services/insights";
import { topTopics } from "@/services/analytics";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { ProductHeader } from "@/components/dashboard/product/product-header";
import { ProductClients } from "@/components/dashboard/product/product-clients";
import { ProductEvents } from "@/components/dashboard/product/product-events";
import { ProductRevenue } from "@/components/dashboard/product/product-revenue";
import { ProductRoadmap } from "@/components/dashboard/product/product-roadmap";
import { Timeline } from "@/components/dashboard/client/timeline";
import { TopicsChart } from "@/components/dashboard/analytics/topics-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductRoadmapItem } from "@/lib/types/database";
import { canManageOperations } from "@/lib/auth/access-control";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, supabase, context] = await Promise.all([getAuthorizedDashboardData(), createClient(), requireAccess("operations")]);
  const canManage = canManageOperations(context.role);

  const product = data.products.find((p) => p.id === id);
  if (!product) notFound();

  const { data: roadmapItems } = await supabase
    .from("product_roadmap_items")
    .select("*")
    .eq("product_id", id)
    .order("created_at", { ascending: false })
    .returns<ProductRoadmapItem[]>();

  const productMatrix = data.matrix.filter((m) => m.product_id === id);
  const productInteractions = data.interactions.filter((i) => i.product_id === id);
  const avgScore = productMatrix.length
    ? Math.round(productMatrix.reduce((sum, r) => sum + r.composite_score, 0) / productMatrix.length)
    : null;
  const avgRelevance = productInteractions.length
    ? productInteractions.reduce((sum, i) => sum + i.relevance, 0) / productInteractions.length
    : 0;

  const implantacoes = productInteractions.filter((i) => i.interaction_type === "implantacao");
  const incidentes = productInteractions.filter((i) => i.interaction_type === "incidente");
  const topics = topTopics(productInteractions, 6);
  const opportunities = detectCrossSellOpportunities(data.matrix, data.clients, data.products).filter(
    (o) => o.productId === id,
  );

  const clientsById = new Map(data.clients.map((c) => [c.id, c]));
  const protectedRevenue = productMatrix.reduce(
    (sum, m) => sum + (clientsById.get(m.client_id)?.contract_value ?? 0),
    0,
  );
  const potentialRevenue = opportunities.reduce(
    (sum, o) => sum + (clientsById.get(o.clientId)?.contract_value ?? 0),
    0,
  );

  return (
    <div>
      <PageTopbar title={product.name} description="Saúde, adoção e oportunidades" />
      <div className="space-y-5 p-6 sm:p-8">
        <ProductHeader
          product={product}
          avgScore={avgScore}
          clientsCount={productMatrix.length}
          interactionsCount={productInteractions.length}
          avgRelevance={avgRelevance}
        />

        <Timeline interactions={productInteractions} data={data} scope="product" editableInteractionIds={productInteractions.filter((item) => canManage || item.created_by === context.userId).map((item) => item.id)} />

        <ProductRevenue protectedRevenue={protectedRevenue} potentialRevenue={potentialRevenue} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ProductClients rows={productMatrix} />
          <TopicsChart data={topics} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ProductRoadmap productId={id} items={roadmapItems ?? []} readOnly={!canManage} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Oportunidades
              </CardTitle>
              <CardDescription>Clientes sem este produto, mas com perfil aderente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {opportunities.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma oportunidade identificada agora.</p>
              )}
              {opportunities.map((opp) => (
                <p key={opp.clientId} className="text-sm">
                  {opp.clientName}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ProductEvents
            title="Implantações"
            description="Marcos de onboarding registrados"
            icon={Rocket}
            events={implantacoes}
            emptyLabel="Nenhuma implantação registrada ainda."
          />
          <ProductEvents
            title="Incidentes"
            description="Ocorrências registradas"
            icon={AlertTriangle}
            events={incidentes}
            emptyLabel="Nenhum incidente registrado."
          />
        </div>
      </div>
    </div>
  );
}
