import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INFLUENCE_CONFIG, RISK_CONFIG } from "@/lib/stakeholder";
import { formatRecency } from "@/lib/status";
import { StakeholderAvatar } from "@/components/dashboard/client/stakeholder-avatar";
import { ReportsToSelect } from "@/components/dashboard/client/reports-to-select";
import { computeStakeholderSentiment, SENTIMENT_CONFIG } from "@/services/sentiment";
import type { InteractionView, StakeholderHealth } from "@/lib/types/database";

export function ClientStakeholders({
  stakeholders,
  interactions,
}: {
  stakeholders: StakeholderHealth[];
  interactions: InteractionView[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pessoas</CardTitle>
        <CardDescription>
          {stakeholders.length} contato{stakeholders.length === 1 ? "" : "s"} mapeado
          {stakeholders.length === 1 ? "" : "s"} · clique na foto para trocar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {stakeholders.map((s) => {
          const influence = INFLUENCE_CONFIG[s.influence];
          const risk = RISK_CONFIG[s.risk];
          const otherContacts = stakeholders
            .filter((o) => o.contact_id !== s.contact_id)
            .map((o) => ({ id: o.contact_id, name: o.name }));
          const sentiment = computeStakeholderSentiment(s.contact_id, interactions);
          return (
            <div key={s.contact_id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex min-w-0 items-center gap-3">
                <StakeholderAvatar contactId={s.contact_id} name={s.name} photoUrl={s.photo_url} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.role ?? "Sem cargo definido"}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ReportsToSelect
                  contactId={s.contact_id}
                  currentValue={s.reports_to_contact_id}
                  options={otherContacts}
                />
                <Badge variant="outline" className={influence.badge}>
                  {influence.label}
                </Badge>
                <Badge variant="outline" className={risk.badge}>
                  <span className={`mr-1 h-1.5 w-1.5 rounded-full ${risk.dot}`} />
                  {risk.label}
                </Badge>
                {sentiment && (
                  <Badge variant="outline" className={SENTIMENT_CONFIG[sentiment].badge}>
                    {SENTIMENT_CONFIG[sentiment].label}
                  </Badge>
                )}
                <span className="w-14 text-right text-xs text-muted-foreground">
                  {s.days_since_contact != null ? formatRecency(s.days_since_contact) : "sem contato"}
                </span>
                <span className="w-8 text-right text-sm font-bold tabular-nums">{s.score}</span>
              </div>
            </div>
          );
        })}
        {stakeholders.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma pessoa cadastrada para este cliente.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
