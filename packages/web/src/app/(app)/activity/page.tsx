import { getDashboardData } from "@/lib/data";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { RelationshipsAgenda } from "@/components/dashboard/relationships/relationships-agenda";

export default async function AtividadePage() {
  const data = await getDashboardData();

  return (
    <div>
      <PageTopbar
        title="Atividade"
        description="Agenda executiva de contatos em toda a carteira"
      />
      <div className="p-6 sm:p-8">
        <RelationshipsAgenda
          interactions={data.interactions}
          managers={data.managers}
          clients={data.clients}
          products={data.products}
          contacts={data.contacts}
        />
      </div>
    </div>
  );
}
