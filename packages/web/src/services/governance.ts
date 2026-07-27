import type { Client, InteractionView } from "@/lib/types/database";

export type GovernanceIssue = {
  key: "owner" | "contract_value" | "renewal" | "interaction";
  label: string;
  description: string;
  clientIds: string[];
};

export type GovernanceSummary = {
  activeClients: number;
  compliantClients: number;
  complianceRate: number;
  issues: GovernanceIssue[];
};

export function buildGovernanceSummary({
  clients,
  interactions,
}: {
  clients: Client[];
  interactions: Array<Pick<InteractionView, "client_id">>;
}): GovernanceSummary {
  const activeClients = clients.filter((client) => client.active);
  const clientsWithInteraction = new Set(interactions.map((interaction) => interaction.client_id));
  const issues: GovernanceIssue[] = [
    {
      key: "owner",
      label: "Sem responsável",
      description: "Clientes ativos ainda sem responsável principal.",
      clientIds: activeClients.filter((client) => !client.owner_manager_id).map((client) => client.id),
    },
    {
      key: "contract_value",
      label: "Sem valor contratual",
      description: "Clientes ativos sem valor de contrato informado.",
      clientIds: activeClients.filter((client) => client.contract_value == null).map((client) => client.id),
    },
    {
      key: "renewal",
      label: "Sem renovação",
      description: "Clientes ativos sem data de renovação informada.",
      clientIds: activeClients.filter((client) => !client.contract_renewal_date).map((client) => client.id),
    },
    {
      key: "interaction",
      label: "Sem interação",
      description: "Clientes ativos que ainda não possuem histórico registrado.",
      clientIds: activeClients.filter((client) => !clientsWithInteraction.has(client.id)).map((client) => client.id),
    },
  ];
  const nonCompliant = new Set(issues.flatMap((issue) => issue.clientIds));
  const compliantClients = Math.max(0, activeClients.length - nonCompliant.size);

  return {
    activeClients: activeClients.length,
    compliantClients,
    complianceRate: activeClients.length === 0 ? 100 : Math.round((compliantClients / activeClients.length) * 100),
    issues,
  };
}
