import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getDashboardData } from "@/lib/data";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { ReportsToSelect } from "@/components/dashboard/client/reports-to-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityEditDialog } from "@/components/management/entity-edit-dialog";
import { INFLUENCE_CONFIG, RISK_CONFIG } from "@/lib/stakeholder";
import { formatRecency } from "@/lib/status";

export default async function PessoasPage() {
  const data = await getDashboardData();
  const rows = [...data.stakeholders].sort(
    (a, b) =>
      ({ alto: 0, medio: 1, baixo: 2 })[a.risk] - ({ alto: 0, medio: 1, baixo: 2 })[b.risk] ||
      a.score - b.score,
  );

  return (
    <div>
      <PageTopbar title="Pessoas" description={`${rows.length} contatos mapeados`} />
      <div className="p-6 sm:p-8">
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Pessoa</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Reporta para</th>
                <th className="px-4 py-3 font-medium">Influência</th>
                <th className="px-4 py-3 font-medium">Risco</th>
                <th className="px-4 py-3 font-medium">Último contato</th>
                <th className="px-5 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((person) => {
                const contact = data.contacts.find((item) => item.id === person.contact_id);
                const hierarchyOptions = rows
                  .filter((item) => item.client_id === person.client_id && item.contact_id !== person.contact_id)
                  .map((item) => ({ id: item.contact_id, name: item.name }));
                const influence = INFLUENCE_CONFIG[person.influence];
                const risk = RISK_CONFIG[person.risk];

                return (
                  <tr key={person.contact_id} className="hover:bg-muted/25">
                    <td className="px-5 py-4">
                      <p className="font-medium">{person.name}</p>
                      <p className="text-xs text-muted-foreground">{person.role ?? person.email ?? "Sem cargo"}</p>
                    </td>
                    <td className="px-4 py-4">{person.client_name}</td>
                    <td className="px-4 py-4">
                      <ReportsToSelect
                        contactId={person.contact_id}
                        currentValue={person.reports_to_contact_id}
                        options={hierarchyOptions}
                        personName={person.name}
                      />
                    </td>
                    <td className="px-4 py-4"><Badge variant="outline" className={influence.badge}>{influence.label}</Badge></td>
                    <td className="px-4 py-4"><Badge variant="outline" className={risk.badge}>{risk.label}</Badge></td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {person.days_since_contact == null ? "Sem contato" : formatRecency(person.days_since_contact)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button render={<Link href={`/accounts/${person.client_id}`} />} nativeButton={false} variant="ghost" size="sm">
                          <ExternalLink /> Ver cliente
                        </Button>
                        {contact && <EntityEditDialog kind="person" item={contact} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma pessoa cadastrada.</p>}
        </div>
      </div>
    </div>
  );
}
