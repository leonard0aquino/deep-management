import { notFound } from "next/navigation";
import { getDashboardData } from "@/lib/data";
import { generateClientBriefing, clientPendingActions, clientNextSteps } from "@/services/client-insights";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { ClientHeader } from "@/components/dashboard/client/client-header";
import { ClientBriefing } from "@/components/dashboard/client/client-briefing";
import { ClientProducts } from "@/components/dashboard/client/client-products";
import { ClientStakeholders } from "@/components/dashboard/client/client-stakeholders";
import { ClientPending } from "@/components/dashboard/client/client-pending";
import { ClientFiles } from "@/components/dashboard/client/client-files";
import { Timeline } from "@/components/dashboard/client/timeline";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getDashboardData();

  const client = data.clients.find((c) => c.id === id);
  if (!client) notFound();

  const health = data.clientHealth.find((h) => h.client_id === id);
  const clientMatrix = data.matrix.filter((m) => m.client_id === id);
  const clientInteractions = data.interactions.filter((i) => i.client_id === id);
  const clientStakeholders = data.stakeholders.filter((s) => s.client_id === id);
  const owner = data.managers.find((manager) => manager.id === client.owner_manager_id);

  const briefing = generateClientBriefing({
    client,
    clientMatrix,
    clientInteractions,
    allMatrix: data.matrix,
    products: data.products,
  });
  const pending = clientPendingActions(clientMatrix);
  const nextSteps = clientNextSteps(clientMatrix);

  return (
    <div>
      <PageTopbar title={client.name} description="Visão 360° do relacionamento" />
      <div className="space-y-5 p-6 sm:p-8">
        <ClientHeader client={client} health={health} owner={owner} />
        <ClientBriefing items={briefing} />
        <ClientProducts rows={clientMatrix} />
        <ClientStakeholders stakeholders={clientStakeholders} interactions={clientInteractions} />
        <ClientPending pending={pending} nextSteps={nextSteps} />
        <Timeline interactions={clientInteractions} data={data} />
        <ClientFiles interactions={clientInteractions} />
      </div>
    </div>
  );
}
