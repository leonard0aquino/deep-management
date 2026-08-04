import Link from "next/link";
import { Plus } from "lucide-react";
import { CommercialDashboard } from "@/components/dashboard/commercial/commercial-dashboard";
import { CommercialNewInteractionButton } from "@/components/dashboard/commercial/commercial-new-interaction-button";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { Button } from "@/components/ui/button";
import { requireAccess } from "@/lib/auth/access-context";
import { getCommercialData } from "@/lib/commercial-data";

export default async function CommercialPage() {
  const context = await requireAccess("commercial");
  const data = await getCommercialData(context);
  const referenceAt = new Date().toISOString();

  return <div><PageTopbar title="Comercial" description="Atividade, funil e agenda da operação de vendas"><CommercialNewInteractionButton clients={data.clients} products={data.products} managers={data.managers} contacts={data.contacts} clientProducts={data.clientProducts} clientProductOwners={data.clientProductOwners} /><Button size="sm" variant="outline" render={<Link href="/commercial/opportunities" />} nativeButton={false}><Plus /> Nova oportunidade</Button></PageTopbar><div className="p-6 sm:p-8"><CommercialDashboard opportunities={data.opportunities} events={data.events} interactions={data.interactions} clients={data.clients} products={data.products} managers={data.managers} referenceAt={referenceAt} /></div></div>;
}
