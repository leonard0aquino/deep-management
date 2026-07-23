import type {
  Client,
  ClientProductMatrixRow,
  InteractionView,
  Product,
} from "@/lib/types/database";
import type { BriefingItem } from "@/services/insights";
import { detectCrossSellOpportunities, detectFrequencyDrops } from "@/services/insights";

/**
 * Resumo Executivo IA escopado a um único cliente — mesmo motor de regras
 * do Executive Briefing da carteira, mas filtrado para este cliente.
 */
export function generateClientBriefing(input: {
  client: Client;
  clientMatrix: ClientProductMatrixRow[];
  clientInteractions: InteractionView[];
  allMatrix: ClientProductMatrixRow[];
  products: Product[];
}): BriefingItem[] {
  const { client, clientMatrix, clientInteractions, allMatrix, products } = input;
  const items: BriefingItem[] = [];

  const critical = clientMatrix.filter((m) => m.status === "critico");
  const alerta = clientMatrix.filter((m) => m.status === "alerta");

  for (const m of critical) {
    items.push({
      text: `${m.product_name} está crítico — sem contato há ${m.days_since_contact} dias.`,
      tone: "critical",
    });
  }
  for (const m of alerta) {
    items.push({
      text: `${m.product_name} precisa de atenção — sem contato há ${m.days_since_contact} dias.`,
      tone: "warning",
    });
  }

  const drops = detectFrequencyDrops(clientInteractions, products);
  for (const drop of drops.slice(0, 2)) {
    items.push({ text: `${drop.productName} perdeu frequência de interação recente.`, tone: "warning" });
  }

  const opportunities = detectCrossSellOpportunities(allMatrix, [client], products).filter(
    (o) => o.clientId === client.id,
  );
  for (const opp of opportunities) {
    items.push({
      text: `Oportunidade: apresentar ${opp.productName} para ${client.name}.`,
      tone: "opportunity",
    });
  }

  if (clientMatrix.length > 0 && critical.length === 0 && alerta.length === 0) {
    items.push({
      text: `Relacionamento saudável em todos os ${clientMatrix.length} produto${
        clientMatrix.length === 1 ? "" : "s"
      } acompanhado${clientMatrix.length === 1 ? "" : "s"}.`,
      tone: "positive",
    });
  }

  if (items.length === 0) {
    items.push({ text: "Ainda não há interações suficientes para gerar insights.", tone: "positive" });
  }

  return items;
}

export function clientPendingActions(clientMatrix: ClientProductMatrixRow[]) {
  return clientMatrix.filter((m) => m.status === "critico" || m.status === "alerta");
}

export function clientNextSteps(clientMatrix: ClientProductMatrixRow[]) {
  return clientMatrix.filter((m) => m.status === "atencao");
}
