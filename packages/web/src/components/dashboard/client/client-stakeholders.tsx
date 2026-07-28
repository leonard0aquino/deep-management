import { AlertTriangle, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INFLUENCE_CONFIG, RISK_CONFIG, RELATIONSHIP_ROLE_CONFIG, CUSTOMER_SENTIMENT_CONFIG } from "@/lib/stakeholder";
import { formatRecency } from "@/lib/status";
import { parseLocalDate } from "@/lib/local-date";
import { StakeholderAvatar } from "@/components/dashboard/client/stakeholder-avatar";
import { ReportsToSelect } from "@/components/dashboard/client/reports-to-select";
import { EntityEditDialog } from "@/components/management/entity-edit-dialog";
import { buildStakeholderCoverage, STRATEGIC_RELATIONSHIP_ROLES } from "@/services/stakeholder-coverage";
import type { ClientContact, DeepManager, StakeholderHealth } from "@/lib/types/database";

export function ClientStakeholders({ stakeholders, contacts, managers, canManage }: {
  stakeholders: StakeholderHealth[];
  contacts: ClientContact[];
  managers: DeepManager[];
  canManage: boolean;
}) {
  const coverage = buildStakeholderCoverage(stakeholders);
  const alerts = [
    coverage.isRelationshipConcentrated && "Relacionamento concentrado em no máximo uma pessoa estratégica.",
    !coverage.hasSponsor && "Patrocinador não mapeado.",
    !coverage.hasDecisionMaker && "Decisor não mapeado.",
    ...coverage.coolingSponsors.map((sponsor) => `Patrocinador ${sponsor.name} exige atenção: contato ou sentimento esfriando.`),
  ].filter(Boolean) as string[];

  return (
    <Card aria-labelledby="stakeholder-map-title">
      <CardHeader>
        <CardTitle id="stakeholder-map-title" className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-violet-600" aria-hidden="true" />Mapa de pessoas e influência</CardTitle>
        <CardDescription>{stakeholders.length} pessoa{stakeholders.length === 1 ? "" : "s"} mapeada{stakeholders.length === 1 ? "" : "s"} · cobertura relacional explicável</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STRATEGIC_RELATIONSHIP_ROLES.map((role) => {
            const covered = coverage.coveredRoles.includes(role);
            return <div key={role} className="flex items-center gap-2 rounded-lg border p-3"><ShieldCheck className={`h-4 w-4 ${covered ? "text-emerald-600" : "text-muted-foreground"}`} aria-hidden="true" /><div><p className="text-xs text-muted-foreground">{RELATIONSHIP_ROLE_CONFIG[role].label}</p><p className="text-sm font-medium">{covered ? "Coberto" : "Não mapeado"}</p></div></div>;
          })}
        </div>

        {alerts.length > 0 && <div role="alert" className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" aria-hidden="true" />Atenção à cobertura</p><ul className="list-disc space-y-1 pl-5">{alerts.map((alert) => <li key={alert}>{alert}</li>)}</ul></div>}

        <div className="space-y-2">
          {stakeholders.map((stakeholder) => {
            const influence = INFLUENCE_CONFIG[stakeholder.influence];
            const risk = RISK_CONFIG[stakeholder.risk];
            const contact = contacts.find((item) => item.id === stakeholder.contact_id);
            const manager = managers.find((item) => item.id === stakeholder.owner_manager_id);
            const managerName = stakeholder.owner_manager_name ?? manager?.name ?? "Sem responsável AISphere";
            const otherContacts = stakeholders.filter((item) => item.contact_id !== stakeholder.contact_id).map((item) => ({ id: item.contact_id, name: item.name }));
            const reportsTo = stakeholders.find((item) => item.contact_id === stakeholder.reports_to_contact_id)?.name;
            return (
              <article key={stakeholder.contact_id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <StakeholderAvatar contactId={stakeholder.contact_id} name={stakeholder.name} photoUrl={stakeholder.photo_url} editable={canManage} />
                    <div className="min-w-0"><p className="truncate font-medium">{stakeholder.name}</p><p className="truncate text-xs text-muted-foreground">{stakeholder.role ?? "Sem cargo definido"}</p></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{stakeholder.relationship_role ? RELATIONSHIP_ROLE_CONFIG[stakeholder.relationship_role].label : "Papel não definido"}</Badge>
                    <Badge variant="outline" className={influence.badge}>{influence.label}</Badge>
                    <Badge variant="outline" className={risk.badge}><span className={`mr-1 h-1.5 w-1.5 rounded-full ${risk.dot}`} />{risk.label}</Badge>
                    {stakeholder.last_customer_sentiment ? <Badge variant="outline" className={CUSTOMER_SENTIMENT_CONFIG[stakeholder.last_customer_sentiment].badge}>{CUSTOMER_SENTIMENT_CONFIG[stakeholder.last_customer_sentiment].label}</Badge> : <Badge variant="outline">Sentimento não registrado</Badge>}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 border-t pt-3 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                  <div><p>Responsável AISphere</p><p className="flex items-center gap-1 font-medium text-foreground"><UserRoundCheck className="h-3.5 w-3.5" aria-hidden="true" />{managerName}</p></div>
                  <div><p>Hierarquia</p>{canManage ? <ReportsToSelect contactId={stakeholder.contact_id} currentValue={stakeholder.reports_to_contact_id} options={otherContacts} personName={stakeholder.name} /> : <p className="font-medium text-foreground">{reportsTo ? `Reporta para ${reportsTo}` : "Sem hierarquia"}</p>}</div>
                  <div><p>Último contato</p><p className="font-medium text-foreground">{stakeholder.days_since_contact !== null ? formatRecency(stakeholder.days_since_contact) : "Sem contato"}</p></div>
                  <div><p>Sentimento registrado</p><p className="font-medium text-foreground">{stakeholder.sentiment_recorded_at ? parseLocalDate(stakeholder.sentiment_recorded_at).toLocaleDateString("pt-BR") : "Não registrado"}</p></div>
                </div>
                {canManage && contact && <div className="mt-3 flex justify-end"><EntityEditDialog kind="person" item={contact} managers={managers} /></div>}
              </article>
            );
          })}
          {stakeholders.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma pessoa cadastrada para este cliente.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
