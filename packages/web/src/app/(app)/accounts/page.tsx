import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getDashboardData } from "@/lib/data";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityEditDialog } from "@/components/management/entity-edit-dialog";
import { scoreLabel, scoreToneClass, formatRecency } from "@/lib/status";

export default async function ClientesPage() {
  const data = await getDashboardData();
  const rows = data.clients.map((client) => ({ client, health: data.clientHealth.find((item) => item.client_id === client.id) }));
  return <div><PageTopbar title="Carteira" description={`${rows.length} clientes acompanhados`} />
    <div className="p-6 sm:p-8"><div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[900px] text-sm"><thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Cliente</th><th className="px-4 py-3 font-medium">Produtos</th><th className="px-4 py-3 font-medium">Último contato</th><th className="px-4 py-3 font-medium">Saúde</th><th className="px-4 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Ações</th></tr></thead>
        <tbody className="divide-y">{rows.map(({ client, health }) => <tr key={client.id} className="hover:bg-muted/25"><td className="px-5 py-4"><p className="font-medium">{client.name}</p><p className="text-xs text-muted-foreground">{client.segment ?? "Sem segmento"}</p></td><td className="px-4 py-4">{health?.tracked_products ?? 0}</td><td className="px-4 py-4 text-muted-foreground">{health ? formatRecency(health.days_since_last_contact) : "Sem contato"}</td><td className="px-4 py-4">{health ? <><span className={`font-bold ${scoreToneClass(health.score)}`}>{health.score}</span><span className={`ml-2 text-xs ${scoreToneClass(health.score)}`}>{scoreLabel(health.score)}</span></> : "—"}</td><td className="px-4 py-4"><Badge variant={client.active ? "outline" : "secondary"}>{client.active ? "Ativo" : "Inativo"}</Badge></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Button render={<Link href={`/accounts/${client.id}`} />} nativeButton={false} variant="ghost" size="sm"><ExternalLink /> Ver</Button><EntityEditDialog kind="client" item={client} /></div></td></tr>)}</tbody>
      </table>{rows.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>}</div></div></div>;
}
