import type { Client, StakeholderHealth, StakeholderRelationshipRole } from "@/lib/types/database";

export const STRATEGIC_RELATIONSHIP_ROLES: StakeholderRelationshipRole[] = [
  "patrocinador",
  "decisor",
  "influenciador",
  "usuario_chave",
];

export type StakeholderCoverage = {
  coveredRoles: StakeholderRelationshipRole[];
  strategicPeopleCount: number;
  isRelationshipConcentrated: boolean;
  hasSponsor: boolean;
  hasDecisionMaker: boolean;
  coolingSponsors: StakeholderHealth[];
};

export function buildStakeholderCoverage(stakeholders: StakeholderHealth[]): StakeholderCoverage {
  const coveredRoles = STRATEGIC_RELATIONSHIP_ROLES.filter((role) =>
    stakeholders.some((stakeholder) => stakeholder.relationship_role === role),
  );
  const strategicPeople = stakeholders.filter((stakeholder) =>
    stakeholder.relationship_role !== null
    && STRATEGIC_RELATIONSHIP_ROLES.includes(stakeholder.relationship_role),
  );
  const sponsors = stakeholders.filter((stakeholder) => stakeholder.relationship_role === "patrocinador");

  return {
    coveredRoles,
    strategicPeopleCount: strategicPeople.length,
    isRelationshipConcentrated: strategicPeople.length <= 1,
    hasSponsor: coveredRoles.includes("patrocinador"),
    hasDecisionMaker: coveredRoles.includes("decisor"),
    coolingSponsors: sponsors.filter((sponsor) =>
      sponsor.days_since_contact === null
      || sponsor.days_since_contact > 30
      || sponsor.last_customer_sentiment === "negative",
    ),
  };
}

export function summarizeStakeholderPortfolio(clients: Client[], stakeholders: StakeholderHealth[]) {
  const activeClients = clients.filter((client) => client.active);
  const coverage = activeClients.map((client) =>
    buildStakeholderCoverage(stakeholders.filter((stakeholder) => stakeholder.client_id === client.id)),
  );
  return {
    concentratedClients: coverage.filter((item) => item.isRelationshipConcentrated).length,
    clientsWithoutSponsor: coverage.filter((item) => !item.hasSponsor).length,
    clientsWithoutDecisionMaker: coverage.filter((item) => !item.hasDecisionMaker).length,
    coolingSponsors: coverage.reduce((sum, item) => sum + item.coolingSponsors.length, 0),
  };
}
