"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, ExternalLink, Tv } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Client, CommercialOpportunity, CommercialOpportunityStage, CommercialOpportunityStageEvent, DeepManager, InteractionView, Product } from "@/lib/types/database";
import { buildCommercialDashboard } from "@/services/commercial-dashboard";
import { COMMERCIAL_STAGE_LABEL, COMMERCIAL_STAGE_ORDER } from "@/services/commercial-opportunities";

const ALL = "__all__";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
const KPI_TONE = ["text-emerald-600", "text-amber-600", "text-rose-600", "text-red-600"];

export function CommercialDashboard({ opportunities, events, interactions, clients, products, managers, referenceAt }: {
  opportunities: CommercialOpportunity[];
  events: CommercialOpportunityStageEvent[];
  interactions: InteractionView[];
  clients: Client[];
  products: Product[];
  managers: DeepManager[];
  referenceAt: string;
}) {
  const [period, setPeriod] = useState("90");
  const [owner, setOwner] = useState(ALL);
  const [stage, setStage] = useState(ALL);
  const [client, setClient] = useState(ALL);
  const [product, setProduct] = useState(ALL);
  const summary = useMemo(() => buildCommercialDashboard({
    opportunities, events, interactions, referenceAt,
    filters: {
      periodDays: period === ALL ? null : Number(period),
      ownerManagerId: owner === ALL ? undefined : owner,
      stage: stage === ALL ? undefined : stage as CommercialOpportunityStage,
      clientId: client === ALL ? undefined : client,
      productId: product === ALL ? undefined : product,
    },
  }), [client, events, interactions, opportunities, owner, period, product, referenceAt, stage]);

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <select aria-label="Período Comercial" value={period} onChange={(event) => setPeriod(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="30">30 dias</option><option value="90">90 dias</option><option value="180">180 dias</option><option value={ALL}>Todo o histórico</option></select>
        <select aria-label="Responsável Comercial" value={owner} onChange={(event) => setOwner(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value={ALL}>Todos os responsáveis</option>{managers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select aria-label="Etapa Comercial" value={stage} onChange={(event) => setStage(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value={ALL}>Todas as etapas</option>{COMMERCIAL_STAGE_ORDER.map((item) => <option key={item} value={item}>{COMMERCIAL_STAGE_LABEL[item]}</option>)}</select>
        <select aria-label="Empresa Comercial" value={client} onChange={(event) => setClient(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value={ALL}>Todas as empresas</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select aria-label="Produto Comercial" value={product} onChange={(event) => setProduct(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value={ALL}>Todos os produtos</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </div>
      <div className="flex gap-2"><Button variant="outline" render={<Link href="/commercial/opportunities" />} nativeButton={false}><ExternalLink /> Gerir funil</Button><Button variant="outline" render={<Link href="/commercial/tv" />} nativeButton={false}><Tv /> Modo TV</Button></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{summary.kpis.map((kpi, index) => <Card key={kpi.key}><CardContent className="p-5"><p className={`text-5xl font-semibold tabular-nums ${KPI_TONE[index]}`}>{kpi.days ?? "—"}</p><p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{kpi.label}</p><p className="mt-2 text-xs text-muted-foreground">{kpi.date ? day.format(new Date(kpi.date)) : "Ainda sem registro"}</p></CardContent></Card>)}</div>

    {summary.overdue.length > 0 && <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><AlertTriangle className="h-4 w-4" /><strong>{summary.overdue.length}</strong> próximo(s) passo(s) atrasado(s).</div>}

    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.6fr]">
      <Card><CardHeader><CardTitle>Funil de vendas</CardTitle></CardHeader><CardContent className="space-y-2">{summary.funnel.map((item, index) => <div key={item.stage} className="relative overflow-hidden rounded-lg border p-3"><div className="absolute inset-y-0 left-0 bg-violet-50" style={{ width: `${Math.max(4, 100 - index * 9)}%` }} /><div className="relative flex items-center justify-between gap-3"><div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{money.format(item.weightedAmount)} ponderado</p></div><div className="text-right"><p className="text-xl font-semibold">{item.count}</p><p className="text-xs text-muted-foreground">{money.format(item.amount)}</p></div></div></div>)}</CardContent></Card>

      <Card><CardHeader><CardTitle>Agenda Comercial</CardTitle></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2">{summary.agenda.slice(0, 12).map((opportunity) => {
        const ownerName = managers.find((item) => item.id === opportunity.owner_manager_id)?.name;
        const clientName = clients.find((item) => item.id === opportunity.client_id)?.name;
        const overdue = opportunity.next_step_at! < referenceAt;
        return <div key={opportunity.id} className={`rounded-lg border border-t-4 p-4 ${overdue ? "border-t-rose-500" : "border-t-cyan-500"}`}><div className="flex items-start justify-between gap-2"><div><p className="font-medium">{clientName ?? opportunity.name}</p><p className="text-xs text-muted-foreground">{opportunity.name}</p></div><Badge variant="outline">{COMMERCIAL_STAGE_LABEL[opportunity.stage]}</Badge></div><p className="mt-5 flex items-center gap-1.5 text-sm font-semibold"><CalendarClock className="h-4 w-4" />{dateTime.format(new Date(opportunity.next_step_at!))}</p><p className="mt-1 text-sm text-muted-foreground">{opportunity.next_step}</p><p className="mt-3 text-xs text-muted-foreground">{ownerName ?? "Sem responsável"}</p></div>;
      })}</div>{summary.agenda.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">Nenhum próximo passo agendado para os filtros.</p>}</CardContent></Card>
    </div>
  </div>;
}
