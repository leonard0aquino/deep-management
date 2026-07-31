import Link from "next/link";
import { AlertTriangle, ExternalLink, ShieldAlert, UserRoundX, UsersRound } from "lucide-react";
import { getAuthorizedDashboardData } from "@/lib/data";
import { requireAccess } from "@/lib/auth/access-context";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types/database";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { ReportsToSelect } from "@/components/dashboard/client/reports-to-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EntityEditDialog } from "@/components/management/entity-edit-dialog";
import { CUSTOMER_SENTIMENT_CONFIG, INFLUENCE_CONFIG, RELATIONSHIP_ROLE_CONFIG, RISK_CONFIG } from "@/lib/stakeholder";
import { formatRecency } from "@/lib/status";
import { summarizeStakeholderPortfolio } from "@/services/stakeholder-coverage";

export default async function PessoasPage() {
  const [data] = await Promise.all([getAuthorizedDashboardData(), requireAccess("operations")]);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user?.id ?? "").maybeSingle<UserProfile>();
  const canManage = profile?.role === "admin" || profile?.role === "gerente";
  const activeClientIds = new Set(data.clients.map((client) => client.id));
  const rows = data.stakeholders
    .filter((item) => activeClientIds.has(item.client_id))
    .sort((a, b) => ({ alto: 0, medio: 1, baixo: 2 })[a.risk] - ({ alto: 0, medio: 1, baixo: 2 })[b.risk] || a.score - b.score);
  const summary = summarizeStakeholderPortfolio(data.clients, rows);
  const indicators = [
    { label: "Contas com relação concentrada", value: summary.concentratedClients, icon: UsersRound },
    { label: "Contas sem patrocinador", value: summary.clientsWithoutSponsor, icon: ShieldAlert },
    { label: "Contas sem decisor", value: summary.clientsWithoutDecisionMaker, icon: UserRoundX },
    { label: "Patrocinadores esfriando", value: summary.coolingSponsors, icon: AlertTriangle },
  ];

  return (
    <div>
      <PageTopbar title="Pessoas" description={`${rows.length} contatos mapeados na carteira ativa`} />
      <div className="space-y-5 p-6 sm:p-8">
        <section aria-label="Cobertura relacional da carteira" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {indicators.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center gap-3 p-4"><div className="rounded-full bg-amber-50 p-2 text-amber-700"><Icon className="h-5 w-5" aria-hidden="true" /></div><div><p className="text-2xl font-bold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>)}
        </section>

        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[1440px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground"><tr>
              <th className="px-5 py-3 font-medium">Pessoa</th><th className="px-4 py-3 font-medium">Cliente</th><th className="px-4 py-3 font-medium">Papel</th><th className="px-4 py-3 font-medium">Responsável AISphere</th><th className="px-4 py-3 font-medium">Reporta para</th><th className="px-4 py-3 font-medium">Sentimento</th><th className="px-4 py-3 font-medium">Influência</th><th className="px-4 py-3 font-medium">Risco</th><th className="px-4 py-3 font-medium">Último contato</th><th className="px-5 py-3 text-right font-medium">Ações</th>
            </tr></thead>
            <tbody className="divide-y">
              {rows.map((person) => {
                const contact = data.contacts.find((item) => item.id === person.contact_id);
                const hierarchyOptions = rows.filter((item) => item.client_id === person.client_id && item.contact_id !== person.contact_id).map((item) => ({ id: item.contact_id, name: item.name }));
                const reportsTo = rows.find((item) => item.contact_id === person.reports_to_contact_id)?.name;
                const influence = INFLUENCE_CONFIG[person.influence];
                const risk = RISK_CONFIG[person.risk];
                return <tr key={person.contact_id} className="hover:bg-muted/25">
                  <td className="px-5 py-4"><p className="font-medium">{person.name}</p><p className="text-xs text-muted-foreground">{person.role ?? person.email ?? "Sem cargo"}</p></td>
                  <td className="px-4 py-4">{person.client_name}</td>
                  <td className="px-4 py-4"><Badge variant="secondary">{person.relationship_role ? RELATIONSHIP_ROLE_CONFIG[person.relationship_role].shortLabel : "Não definido"}</Badge></td>
                  <td className="px-4 py-4">{person.owner_manager_name ?? "Não definido"}</td>
                  <td className="px-4 py-4">{canManage ? <ReportsToSelect contactId={person.contact_id} currentValue={person.reports_to_contact_id} options={hierarchyOptions} personName={person.name} /> : (reportsTo ?? "Sem hierarquia")}</td>
                  <td className="px-4 py-4">{person.last_customer_sentiment ? <Badge variant="outline" className={CUSTOMER_SENTIMENT_CONFIG[person.last_customer_sentiment].badge}>{CUSTOMER_SENTIMENT_CONFIG[person.last_customer_sentiment].label}</Badge> : <span className="text-muted-foreground">Não registrado</span>}</td>
                  <td className="px-4 py-4"><Badge variant="outline" className={influence.badge}>{influence.label}</Badge></td>
                  <td className="px-4 py-4"><Badge variant="outline" className={risk.badge}>{risk.label}</Badge></td>
                  <td className="px-4 py-4 text-muted-foreground">{person.days_since_contact === null ? "Sem contato" : formatRecency(person.days_since_contact)}</td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-2"><Button render={<Link href={`/accounts/${person.client_id}`} />} nativeButton={false} variant="ghost" size="sm"><ExternalLink /> Ver cliente</Button>{canManage && contact && <EntityEditDialog kind="person" item={contact} managers={data.managers} />}</div></td>
                </tr>;
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma pessoa cadastrada.</p>}
        </div>
      </div>
    </div>
  );
}
