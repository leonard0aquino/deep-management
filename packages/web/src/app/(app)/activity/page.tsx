import { getAuthorizedDashboardData } from "@/lib/data";
import { requireAccess } from "@/lib/auth/access-context";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { NewInteractionButton } from "@/components/dashboard/executive/new-interaction-button";
import { RelationshipsAgenda } from "@/components/dashboard/relationships/relationships-agenda";

export default async function AtividadePage() {
  const [data, context] = await Promise.all([getAuthorizedDashboardData(), requireAccess("operations")]);
  const editableInteractionIds = data.interactions
    .filter((item) => context.role === "admin" || context.role === "gerente" || item.created_by === context.userId)
    .map((item) => item.id);

  return (
    <div>
      <PageTopbar
        title="Atividade"
        description="Agenda executiva de contatos em toda a carteira"
      >
        <NewInteractionButton data={data} />
      </PageTopbar>
      <div className="p-6 sm:p-8">
        <RelationshipsAgenda
          interactions={data.interactions}
          managers={data.managers}
          clients={data.clients}
          products={data.products}
          contacts={data.contacts}
          clientProducts={data.clientProducts}
          editableInteractionIds={editableInteractionIds}
        />
      </div>
    </div>
  );
}
