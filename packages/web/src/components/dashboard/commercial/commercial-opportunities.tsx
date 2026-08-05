"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Pencil, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { CommercialCompanyDialog, CommercialContactDialog } from "./commercial-company-dialogs";
import type { Client, ClientContact, CommercialOpportunity, CommercialOpportunityStage, CommercialOpportunityStageEvent, DeepManager, Product, UserProfile } from "@/lib/types/database";
import { buildCommercialFunnel, COMMERCIAL_STAGE_LABEL, COMMERCIAL_STAGE_ORDER, filterCommercialOpportunities } from "@/services/commercial-opportunities";

const ALL = "__all__";
const NONE = "__none__";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

function inputDateTime(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function CommercialOpportunities({ opportunities, events, clients, contacts, products, managers, users, currentManager, currentUserName, isCommercialUser = false, canManageProspects = false }: {
  opportunities: CommercialOpportunity[];
  events: CommercialOpportunityStageEvent[];
  clients: Client[];
  contacts: ClientContact[];
  products: Product[];
  managers: DeepManager[];
  users: Array<Pick<UserProfile, "id" | "name">>;
  currentManager: DeepManager | null;
  currentUserName: string;
  isCommercialUser?: boolean;
  canManageProspects?: boolean;
}) {
  const router = useRouter();
  const [stageFilter, setStageFilter] = useState(ALL);
  const [ownerFilter, setOwnerFilter] = useState(ALL);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CommercialOpportunity | null | undefined>(undefined);
  const [creatingProspect, setCreatingProspect] = useState(false);
  const filtered = useMemo(() => filterCommercialOpportunities(opportunities, {
    stage: stageFilter === ALL ? undefined : stageFilter as CommercialOpportunityStage,
    ownerManagerId: ownerFilter === ALL ? undefined : ownerFilter,
    search,
  }), [opportunities, ownerFilter, search, stageFilter]);
  const funnel = buildCommercialFunnel(filtered);

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="grid flex-1 gap-2 sm:grid-cols-3">
        <label className="relative"><span className="sr-only">Buscar oportunidade</span><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar oportunidade" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar oportunidade" className="pl-9" /></label>
        <select aria-label="Filtrar por etapa" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value={ALL}>Todas as etapas</option>{COMMERCIAL_STAGE_ORDER.map((stage) => <option key={stage} value={stage}>{COMMERCIAL_STAGE_LABEL[stage]}</option>)}</select>
        <select aria-label="Filtrar por responsável" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value={ALL}>Todos os responsáveis</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select>
      </div>
      <div className="flex gap-2">{canManageProspects && <Button variant="outline" onClick={() => setCreatingProspect(true)}><Plus /> Novo prospect</Button>}<Button onClick={() => setEditing(null)}><Plus /> Nova oportunidade</Button></div>
    </div>

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {funnel.map((item) => <Card key={item.stage} className={item.stage === "won" ? "border-emerald-200" : item.stage === "lost" ? "border-rose-200" : ""}>
        <CardHeader className="pb-2"><CardTitle className="flex items-center justify-between text-sm"><span>{item.label}</span><Badge variant="outline">{item.count}</Badge></CardTitle></CardHeader>
        <CardContent><p className="text-xl font-semibold">{money.format(item.amount)}</p><p className="text-xs text-muted-foreground">Ponderado: {money.format(item.weightedAmount)}</p></CardContent>
      </Card>)}
    </div>

    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[1040px] text-sm"><thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Oportunidade</th><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Etapa</th><th className="px-4 py-3">Responsável</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Próximo passo</th><th className="px-4 py-3 text-right">Ação</th></tr></thead>
        <tbody className="divide-y">{filtered.map((opportunity) => {
          const client = clients.find((item) => item.id === opportunity.client_id);
          const owner = managers.find((item) => item.id === opportunity.owner_manager_id);
          const ownerUser = users.find((item) => item.id === opportunity.created_by);
          return <tr key={opportunity.id}><td className="px-4 py-4 font-medium">{opportunity.name}</td><td className="px-4 py-4"><span>{client?.name ?? "Empresa removida"}</span>{client?.client_kind === "prospect" && <Badge variant="outline" className="ml-2">Prospect</Badge>}</td><td className="px-4 py-4"><Badge variant="outline">{COMMERCIAL_STAGE_LABEL[opportunity.stage]}</Badge></td><td className="px-4 py-4">{owner?.name ?? ownerUser?.name ?? "Sem responsável"}</td><td className="px-4 py-4"><p className="font-medium">{money.format(Number(opportunity.amount))}</p><p className="text-xs text-muted-foreground">{opportunity.probability}%</p></td><td className="px-4 py-4"><p>{opportunity.next_step ?? "Não definido"}</p>{opportunity.next_step_at && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" />{dateTime.format(new Date(opportunity.next_step_at))}</p>}</td><td className="px-4 py-4 text-right"><Button size="sm" variant="ghost" onClick={() => setEditing(opportunity)}><Pencil /> Editar</Button></td></tr>;
        })}</tbody>
      </table>
      {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma oportunidade encontrada para os filtros.</p>}
    </div>

    <Card><CardHeader><CardTitle className="text-base">Movimentos recentes</CardTitle></CardHeader><CardContent className="space-y-2">{events.slice(0, 10).map((event) => {
      const opportunity = opportunities.find((item) => item.id === event.opportunity_id);
      return <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0"><span><strong>{opportunity?.name ?? "Oportunidade"}</strong>: {event.from_stage ? `${COMMERCIAL_STAGE_LABEL[event.from_stage]} → ` : "criada em "}{COMMERCIAL_STAGE_LABEL[event.to_stage]}</span><span className="text-xs text-muted-foreground">{dateTime.format(new Date(event.created_at))}</span></div>;
    })}{events.length === 0 && <p className="text-sm text-muted-foreground">Nenhum movimento registrado.</p>}</CardContent></Card>

    {editing !== undefined && <OpportunityDialog opportunity={editing} clients={clients} contacts={contacts} products={products} managers={managers} users={users} currentManager={currentManager} currentUserName={currentUserName} isCommercialUser={isCommercialUser} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); router.refresh(); }} />}
    {creatingProspect && <ProspectDialog onClose={() => setCreatingProspect(false)} onSaved={() => { setCreatingProspect(false); router.refresh(); }} />}
  </div>;
}

function ProspectDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function save(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createClient().from("clients").insert({
        name: String(formData.get("name") ?? "").trim(),
        segment: String(formData.get("segment") ?? "").trim() || null,
        client_kind: "prospect",
        active: true,
      });
      if (result.error) return setError(result.error.message);
      onSaved();
    });
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="sm:max-w-md"><form action={save} className="space-y-4"><DialogHeader><DialogTitle>Novo prospect</DialogTitle><DialogDescription>Crie a empresa uma única vez para vinculá-la às oportunidades.</DialogDescription></DialogHeader><label className="space-y-1.5 text-sm font-medium">Empresa<Input name="name" required minLength={2} maxLength={160} /></label><label className="space-y-1.5 text-sm font-medium">Segmento<Input name="segment" maxLength={100} /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Criando..." : "Criar prospect"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function OpportunityDialog({ opportunity, clients, contacts, products, managers, users, currentManager, currentUserName, isCommercialUser, onClose, onSaved }: {
  opportunity: CommercialOpportunity | null;
  clients: Client[];
  contacts: ClientContact[];
  products: Product[];
  managers: DeepManager[];
  users: Array<Pick<UserProfile, "id" | "name">>;
  currentManager: DeepManager | null;
  currentUserName: string;
  isCommercialUser: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [stage, setStage] = useState<CommercialOpportunityStage>(opportunity?.stage ?? "prospecting");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clientsList, setClientsList] = useState(clients);
  const [contactsList, setContactsList] = useState(contacts);
  const [clientId, setClientId] = useState(opportunity?.client_id ?? "");
  const [contactId, setContactId] = useState(opportunity?.contact_id ?? "");
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [creatingContact, setCreatingContact] = useState(false);
  const opportunityManager = opportunity
    ? managers.find((manager) => manager.id === opportunity.owner_manager_id) ?? null
    : currentManager;
  const opportunityOwnerUser = opportunity
    ? users.find((user) => user.id === opportunity.created_by) ?? null
    : null;
  const availableContacts = contactsList.filter((contact) => contact.client_id === clientId);

  function save(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const value = (key: string) => String(formData.get(key) ?? "").trim();
      const nextStepAt = value("next_step_at");
      const payload = {
        client_id: clientId,
        contact_id: contactId || null,
        product_id: value("product_id") === NONE ? null : value("product_id"),
        owner_manager_id: opportunity?.owner_manager_id ?? currentManager?.id ?? null,
        name: value("name"),
        stage,
        amount: Number(value("amount")),
        probability: Number(value("probability")),
        next_step: value("next_step") || null,
        next_step_at: nextStepAt ? new Date(nextStepAt).toISOString() : null,
        loss_reason: stage === "lost" ? value("loss_reason") : null,
      };
      const supabase = createClient();
      const result = opportunity
        ? await supabase.from("commercial_opportunities").update(payload).eq("id", opportunity.id)
        : await supabase.from("commercial_opportunities").insert(payload);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      onSaved();
    });
  }

  return <><Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><form action={save} className="space-y-5"><DialogHeader><DialogTitle>{opportunity ? "Editar oportunidade" : "Nova oportunidade"}</DialogTitle><DialogDescription>Empresa, contato, etapa, valor e próximo passo alimentam o funil oficial da AISphere.</DialogDescription></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Nome da oportunidade<Input name="name" required minLength={3} maxLength={160} defaultValue={opportunity?.name ?? ""} /></label>
      <div className="space-y-1.5"><label htmlFor="opportunity-company" className="text-sm font-medium">Empresa</label><div className="flex gap-2"><select id="opportunity-company" required value={clientId} onChange={(event) => { setClientId(event.target.value); setContactId(""); }} className="block h-9 min-w-0 flex-1 rounded-md border bg-background px-3"><option value="" disabled>Selecione</option>{clientsList.filter((client) => client.active).map((client) => <option key={client.id} value={client.id}>{client.name}{client.client_kind === "prospect" ? " (prospect)" : ""}</option>)}</select><Button type="button" variant="outline" onClick={() => setCreatingCompany(true)}><Plus /> Nova</Button></div></div>
      <label className="space-y-1.5 text-sm font-medium">Produto<select name="product_id" defaultValue={opportunity?.product_id ?? NONE} className="block h-9 w-full rounded-md border bg-background px-3"><option value={NONE}>Ainda não definido</option>{products.filter((product) => product.active).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
      <div className="space-y-1.5"><label htmlFor="opportunity-contact" className="text-sm font-medium">Contato da empresa</label><div className="flex gap-2"><select id="opportunity-contact" value={contactId} onChange={(event) => setContactId(event.target.value)} disabled={!clientId} className="block h-9 min-w-0 flex-1 rounded-md border bg-background px-3"><option value="">Não informado</option>{availableContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.email ? ` · ${contact.email}` : contact.phone ? ` · ${contact.phone}` : ""}</option>)}</select><Button type="button" variant="outline" disabled={!clientId} onClick={() => setCreatingContact(true)}><Plus /> Novo</Button></div></div>
      <label className="space-y-1.5 text-sm font-medium">Responsável AISphere<Input aria-label="Responsável AISphere" value={opportunityManager?.name ?? opportunityOwnerUser?.name ?? currentUserName} readOnly aria-readonly="true" /><span className="block text-[11px] font-normal text-muted-foreground">Preenchido automaticamente com o usuário logado.</span></label>
      <label className="space-y-1.5 text-sm font-medium">Etapa<select name="stage" value={stage} onChange={(event) => setStage(event.target.value as CommercialOpportunityStage)} className="block h-9 w-full rounded-md border bg-background px-3">{COMMERCIAL_STAGE_ORDER.map((item) => <option key={item} value={item}>{COMMERCIAL_STAGE_LABEL[item]}</option>)}</select></label>
      <label className="space-y-1.5 text-sm font-medium">Valor (R$)<Input name="amount" type="number" min="0" step="0.01" required defaultValue={opportunity?.amount ?? 0} /></label>
      <label className="space-y-1.5 text-sm font-medium">Probabilidade (%)<Input name="probability" type="number" min="0" max="100" step="1" required defaultValue={opportunity?.probability ?? 10} /></label>
      <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Próximo passo<Input name="next_step" minLength={3} maxLength={500} defaultValue={opportunity?.next_step ?? ""} /></label>
      <label className="space-y-1.5 text-sm font-medium">Data e hora<Input name="next_step_at" type="datetime-local" defaultValue={inputDateTime(opportunity?.next_step_at ?? null)} /></label>
      {stage === "lost" && <label className="space-y-1.5 text-sm font-medium">Motivo da perda<Input name="loss_reason" required minLength={3} maxLength={500} defaultValue={opportunity?.loss_reason ?? ""} /></label>}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!opportunity && !currentManager && !isCommercialUser && <p role="alert" className="text-sm text-destructive">A criação sem gestor DEEP vinculado é exclusiva para usuários da área Comercial.</p>}
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending || (!opportunity && !currentManager && !isCommercialUser)}>{pending ? "Salvando..." : "Salvar oportunidade"}</Button></DialogFooter>
  </form></DialogContent></Dialog>
  <CommercialCompanyDialog open={creatingCompany} onOpenChange={setCreatingCompany} existingClients={clientsList} onCreated={({ company, contact, warning }) => { setClientsList((current) => [...current, company].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))); setClientId(company.id); setContactId(contact?.id ?? ""); if (contact) setContactsList((current) => [...current, contact]); if (warning) setError(warning); }} />
  <CommercialContactDialog open={creatingContact} onOpenChange={setCreatingContact} clientId={clientId} onCreated={(contact) => { setContactsList((current) => [...current, contact]); setContactId(contact.id); }} />
  </>;
}
