import { CommercialDashboard } from "@/components/dashboard/commercial/commercial-dashboard";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { requireAccess } from "@/lib/auth/access-context";
import { getCommercialData } from "@/lib/commercial-data";

export default async function CommercialPage() {
  const context = await requireAccess("commercial");
  const data = await getCommercialData(context);
  const referenceAt = new Date().toISOString();

  return <div><PageTopbar title="Comercial" description="Cockpit gerencial atualizado manualmente" /><div className="p-6 sm:p-8"><CommercialDashboard states={data.states} agendaEntries={data.agendaEntries} dailyProspecting={data.dailyProspecting} opportunities={data.opportunities} opportunityEvents={data.opportunityEvents} clients={data.clients} users={data.users} currentUserId={data.currentUserId} referenceAt={referenceAt} /></div></div>;
}
