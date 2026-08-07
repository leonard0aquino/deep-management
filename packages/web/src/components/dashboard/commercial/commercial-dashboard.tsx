"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, Check, Pencil, Plus, Tv } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { CommercialAgendaEntry, CommercialAgendaEntryKind, CommercialCockpitStage, CommercialCockpitState } from "@/lib/types/database";
import {
  buildCommercialDashboard,
  commercialAgendaStage,
  COMMERCIAL_COCKPIT_KIND_LABEL,
  type CommercialDashboardUser,
} from "@/services/commercial-dashboard";

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
const updated = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const KPI_TONE: Record<string, string> = { meeting: "text-emerald-600", nda_poc: "text-amber-600", proposal: "text-rose-600", won: "text-red-600" };
const FUNNEL_TONE: Record<CommercialCockpitStage, string> = { prospecting: "bg-indigo-500", meetings: "bg-violet-500", nda_poc: "bg-pink-500", won: "bg-emerald-500" };

function inputDateTime(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function CommercialDashboard({ states, agendaEntries, users, currentUserId, referenceAt }: {
  states: CommercialCockpitState[];
  agendaEntries: CommercialAgendaEntry[];
  users: CommercialDashboardUser[];
  currentUserId: string;
  referenceAt: string;
}) {
  const [editingCockpit, setEditingCockpit] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<CommercialAgendaEntry | null | undefined>(undefined);
  const summary = useMemo(
    () => buildCommercialDashboard({ states, agendaEntries, users, referenceAt }),
    [agendaEntries, referenceAt, states, users],
  );
  const currentUser = users.find((user) => user.id === currentUserId);
  const canEditCockpit = Boolean(currentUser?.stages.length);
  const canAddAgenda = Boolean(currentUser);

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm font-medium">Painel Gerencial</p><p className="mt-1 text-xs text-muted-foreground">{summary.updatedAt ? `Atualizado por ${summary.updatedBy ?? "usuário Comercial"} em ${updated.format(new Date(summary.updatedAt))}` : "Ainda sem atualização registrada."}</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setEditingCockpit(true)} disabled={!canEditCockpit} title={!canEditCockpit ? "Somente usuários da área Comercial com etapas atribuídas podem editar" : undefined}><Pencil /> Editar painel</Button><Button variant="outline" render={<Link href="/commercial/tv" />} nativeButton={false}><Tv /> Modo TV</Button></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{summary.kpis.map((kpi) => <Card key={kpi.key}><CardContent className="p-5"><p className={`text-5xl font-semibold tabular-nums ${KPI_TONE[kpi.key]}`}>{kpi.days ?? "—"}</p><p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{kpi.label}</p><p className="mt-2 text-xs text-muted-foreground">{kpi.date ? day.format(new Date(`${kpi.date}T12:00:00Z`)) : "Ainda sem registro"}</p></CardContent></Card>)}</div>

    {summary.overdue.length > 0 && <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><AlertTriangle className="h-4 w-4" /><strong>{summary.overdue.length}</strong> compromisso(s) atrasado(s).</div>}

    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.6fr]">
      <Card><CardHeader><CardTitle>Funil de vendas</CardTitle></CardHeader><CardContent className="space-y-3">{summary.funnel.map((item, index) => <div key={item.key}><div className={`relative mx-auto overflow-hidden rounded-xl px-5 py-4 text-white ${FUNNEL_TONE[item.key]}`} style={{ width: `${100 - index * 9}%` }}><p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-85">{item.label}</p><p className="mt-1 text-3xl font-bold tabular-nums">{item.count}</p></div>{index > 0 && <p className="py-1 text-center text-xs font-semibold text-muted-foreground">{item.conversion === null ? "—" : `${item.conversion}%`} de conversão</p>}</div>)}{summary.funnel.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma etapa Comercial atribuída.</p>}</CardContent></Card>

      <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Agenda Comercial</CardTitle><p className="mt-1 text-xs text-muted-foreground">Inclusão rápida.</p></div><Button size="sm" onClick={() => setEditingAgenda(null)} disabled={!canAddAgenda} title={!canAddAgenda ? "Somente usuários da área Comercial podem adicionar" : undefined}><Plus /> Adicionar</Button></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2">{summary.agenda.slice(0, 12).map((entry) => {
        const ownerName = users.find((user) => user.id === entry.owner_user_id)?.name ?? "Comercial";
        const overdueEntry = entry.scheduled_at < referenceAt;
        const canComplete = entry.scheduled_at <= referenceAt;
        const isOwner = entry.owner_user_id === currentUserId;
        return <div key={entry.id} className={`rounded-lg border border-t-4 p-4 ${overdueEntry ? "border-t-rose-500" : "border-t-cyan-500"}`}><div className="flex items-start justify-between gap-2"><div><p className="font-medium">{entry.company_name}</p><p className="text-xs text-muted-foreground">{entry.title}</p></div><Badge variant="outline">{COMMERCIAL_COCKPIT_KIND_LABEL[entry.kind]}</Badge></div><p className="mt-5 flex items-center gap-1.5 text-sm font-semibold"><CalendarClock className="h-4 w-4" />{dateTime.format(new Date(entry.scheduled_at))}</p><div className="mt-3 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{ownerName}</span>{isOwner && <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setEditingAgenda(entry)} aria-label={`Editar ${entry.company_name}`}><Pencil /></Button><AgendaStatusButton entry={entry} currentUserId={currentUserId} disabled={!canComplete} /></div>}</div></div>;
      })}</div>{summary.agenda.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">Nenhum compromisso Comercial agendado.</p>}</CardContent></Card>
    </div>

    {editingCockpit && <CockpitDialog states={states} users={users} currentUserId={currentUserId} onClose={() => setEditingCockpit(false)} />}
    {editingAgenda !== undefined && <AgendaDialog entry={editingAgenda} users={users} currentUserId={currentUserId} onClose={() => setEditingAgenda(undefined)} />}
  </div>;
}

function CockpitDialog({ states, users, currentUserId, onClose }: { states: CommercialCockpitState[]; users: CommercialDashboardUser[]; currentUserId: string; onClose: () => void }) {
  const router = useRouter();
  const ownerId = currentUserId;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const state = states.find((item) => item.owner_user_id === ownerId);
  const owner = users.find((user) => user.id === ownerId);
  const ownerStages = new Set(owner?.stages ?? []);

  function save(formData: FormData) {
    setError(null);
    const dateValue = (name: string) => String(formData.get(name) ?? "") || null;
    const payload = {
      owner_user_id: ownerId,
      prospecting_count: ownerStages.has("prospecting") ? Number(formData.get("prospecting_count") ?? 0) : state?.prospecting_count ?? 0,
      meetings_count: state?.meetings_count ?? 0,
      nda_poc_count: ownerStages.has("nda_poc") ? Number(formData.get("nda_poc_count") ?? 0) : state?.nda_poc_count ?? 0,
      won_count: ownerStages.has("won") ? Number(formData.get("won_count") ?? 0) : state?.won_count ?? 0,
      last_meeting_on: ownerStages.has("meetings") ? dateValue("last_meeting_on") : state?.last_meeting_on ?? null,
      last_nda_poc_on: ownerStages.has("nda_poc") ? dateValue("last_nda_poc_on") : state?.last_nda_poc_on ?? null,
      last_proposal_on: ownerStages.has("nda_poc") ? dateValue("last_proposal_on") : state?.last_proposal_on ?? null,
      last_won_on: ownerStages.has("won") ? dateValue("last_won_on") : state?.last_won_on ?? null,
      created_by: currentUserId,
      updated_by: currentUserId,
    };
    startTransition(async () => {
      const { error: saveError } = await createClient().from("commercial_cockpit_states").upsert(payload, { onConflict: "owner_user_id" });
      if (saveError) return setError(saveError.message);
      onClose();
      router.refresh();
    });
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><form key={ownerId} action={save} className="space-y-5"><DialogHeader><DialogTitle>Editar painel Comercial</DialogTitle><DialogDescription>Atualize somente as etapas atribuídas ao responsável. Reuniões agendadas são contabilizadas automaticamente pela agenda.</DialogDescription></DialogHeader><label className="space-y-1.5 text-sm font-medium">Responsável AISphere<Input value={owner?.name ?? "Usuário Comercial"} readOnly aria-readonly="true" /></label><p className="-mt-3 text-xs text-muted-foreground">Preenchido automaticamente com o usuário logado.</p>{ownerStages.size === 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Este usuário ainda não possui etapas Comerciais atribuídas.</p>}<div className="grid gap-4 sm:grid-cols-2">{ownerStages.has("prospecting") && <NumberField name="prospecting_count" label="Prospecção" value={state?.prospecting_count ?? 0} />}{ownerStages.has("nda_poc") && <NumberField name="nda_poc_count" label="NDA / POC" value={state?.nda_poc_count ?? 0} />}{ownerStages.has("won") && <NumberField name="won_count" label="Vendas fechadas" value={state?.won_count ?? 0} />}</div><div className="grid gap-4 sm:grid-cols-2">{ownerStages.has("meetings") && <DateField name="last_meeting_on" label="Última reunião realizada" value={state?.last_meeting_on} />}{ownerStages.has("nda_poc") && <DateField name="last_nda_poc_on" label="Último NDA / POC" value={state?.last_nda_poc_on} />}{ownerStages.has("nda_poc") && <DateField name="last_proposal_on" label="Última proposta enviada" value={state?.last_proposal_on} />}{ownerStages.has("won") && <DateField name="last_won_on" label="Última venda fechada" value={state?.last_won_on} />}</div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending || ownerStages.size === 0}>{pending ? "Salvando..." : "Salvar painel"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function NumberField({ name, label, value }: { name: string; label: string; value: number }) {
  return <label className="space-y-1.5 text-sm font-medium">{label}<Input name={name} type="number" min="0" step="1" required defaultValue={value} /></label>;
}

function DateField({ name, label, value }: { name: string; label: string; value?: string | null }) {
  return <label className="space-y-1.5 text-sm font-medium">{label}<Input name={name} type="date" max={new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })} defaultValue={value ?? ""} /></label>;
}

function AgendaDialog({ entry, users, currentUserId, onClose }: { entry: CommercialAgendaEntry | null; users: CommercialDashboardUser[]; currentUserId: string; onClose: () => void }) {
  const router = useRouter();
  const initialOwner = currentUserId;
  const initialStages = new Set(users.find((user) => user.id === initialOwner)?.stages ?? []);
  const firstAllowedKind = (Object.keys(COMMERCIAL_COCKPIT_KIND_LABEL) as CommercialAgendaEntryKind[]).find((candidate) => {
    const requiredStage = commercialAgendaStage(candidate);
    return requiredStage === null || initialStages.has(requiredStage);
  }) ?? "other";
  const ownerId = currentUserId;
  const [kind, setKind] = useState<CommercialAgendaEntryKind>(entry?.kind ?? firstAllowedKind);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ownerStages = new Set(users.find((user) => user.id === ownerId)?.stages ?? []);
  const allowedKinds = (Object.keys(COMMERCIAL_COCKPIT_KIND_LABEL) as CommercialAgendaEntryKind[]).filter((candidate) => {
    const requiredStage = commercialAgendaStage(candidate);
    return requiredStage === null || ownerStages.has(requiredStage);
  });

  function save(formData: FormData) {
    setError(null);
    const scheduledAt = String(formData.get("scheduled_at") ?? "");
    const payload = {
      owner_user_id: ownerId,
      company_name: String(formData.get("company_name") ?? ""),
      title: String(formData.get("title") ?? ""),
      kind: String(formData.get("kind") ?? "other") as CommercialAgendaEntryKind,
      scheduled_at: new Date(scheduledAt).toISOString(),
      updated_by: currentUserId,
    };
    startTransition(async () => {
      const table = createClient().from("commercial_agenda_entries");
      const result = entry
        ? await table.update(payload).eq("id", entry.id)
        : await table.insert({ ...payload, created_by: currentUserId });
      if (result.error) return setError(result.error.message);
      onClose();
      router.refresh();
    });
  }

  const ownerName = users.find((user) => user.id === ownerId)?.name ?? "Usuário Comercial";
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="sm:max-w-lg"><form action={save} className="space-y-4"><DialogHeader><DialogTitle>{entry ? "Editar compromisso" : "Adicionar compromisso"}</DialogTitle><DialogDescription>Agenda manual do Comercial. Ao concluir, o indicador correspondente será atualizado.</DialogDescription></DialogHeader><label className="space-y-1.5 text-sm font-medium">Responsável AISphere<Input value={ownerName} readOnly aria-readonly="true" /></label><p className="-mt-2 text-xs text-muted-foreground">Preenchido automaticamente com o usuário logado.</p><label className="space-y-1.5 text-sm font-medium">Empresa<Input name="company_name" required minLength={2} maxLength={160} defaultValue={entry?.company_name ?? ""} /></label><label className="space-y-1.5 text-sm font-medium">Compromisso<Input name="title" required minLength={2} maxLength={200} defaultValue={entry?.title ?? ""} /></label><label className="space-y-1.5 text-sm font-medium">Tipo<select name="kind" value={kind} onChange={(event) => setKind(event.target.value as CommercialAgendaEntryKind)} className="block h-9 w-full rounded-md border bg-background px-3">{allowedKinds.map((value) => <option key={value} value={value}>{COMMERCIAL_COCKPIT_KIND_LABEL[value]}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium">Data e hora<Input name="scheduled_at" type="datetime-local" required defaultValue={inputDateTime(entry?.scheduled_at ?? null)} /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter>{entry && <AgendaCancelButton entry={entry} currentUserId={currentUserId} onSaved={() => { onClose(); router.refresh(); }} onError={setError} />}<Button type="button" variant="outline" onClick={onClose}>Voltar</Button><Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar compromisso"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function AgendaStatusButton({ entry, currentUserId, disabled }: { entry: CommercialAgendaEntry; currentUserId: string; disabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return <><Button size="sm" variant="ghost" disabled={disabled || pending} title={disabled ? "Compromissos futuros só podem ser concluídos após a data" : "Marcar como concluído"} aria-label={`Concluir ${entry.company_name}`} onClick={() => startTransition(async () => {
    setError(null);
    const { error } = await createClient().from("commercial_agenda_entries").update({ status: "completed", updated_by: currentUserId }).eq("id", entry.id);
    if (error) return setError(error.message);
    router.refresh();
  })}><Check /></Button>{error && <span role="alert" className="sr-only">{error}</span>}</>;
}

function AgendaCancelButton({ entry, currentUserId, onSaved, onError }: { entry: CommercialAgendaEntry; currentUserId: string; onSaved: () => void; onError: (message: string) => void }) {
  const [pending, startTransition] = useTransition();
  return <Button type="button" variant="ghost" disabled={pending} onClick={() => startTransition(async () => {
    const { error } = await createClient().from("commercial_agenda_entries").update({ status: "cancelled", updated_by: currentUserId }).eq("id", entry.id);
    if (error) return onError(error.message);
    onSaved();
  })}>Cancelar compromisso</Button>;
}
