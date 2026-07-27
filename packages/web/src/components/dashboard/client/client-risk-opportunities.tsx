"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Pencil, Plus, ShieldAlert, Sparkles, Trash2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseLocalDate } from "@/lib/local-date";
import { createClient } from "@/lib/supabase/client";
import type {
  ClientPortfolioItemImpact,
  ClientPortfolioItemKind,
  ClientPortfolioItemProbability,
  ClientPortfolioItemStatus,
  ClientRiskOpportunity,
  DeepManager,
} from "@/lib/types/database";
import {
  getPriorityLabel,
  getPriorityScore,
  IMPACT_LABEL,
  isPortfolioItemClosed,
  isPortfolioItemOverdue,
  PORTFOLIO_ITEM_STATUS,
  PROBABILITY_LABEL,
  sortPortfolioItems,
  summarizePortfolioItems,
} from "@/services/risk-opportunities";

const fieldClass = "space-y-1.5 text-sm font-medium";
const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function formatDate(value: string) {
  return parseLocalDate(value).toLocaleDateString("pt-BR");
}

function ItemList({
  kind,
  items,
  managers,
  canManage,
  onEdit,
}: {
  kind: ClientPortfolioItemKind;
  items: ClientRiskOpportunity[];
  managers: DeepManager[];
  canManage: boolean;
  onEdit: (item: ClientRiskOpportunity) => void;
}) {
  const filtered = sortPortfolioItems(items.filter((item) => item.kind === kind));
  const isRisk = kind === "risco";

  return (
    <section aria-labelledby={`portfolio-${kind}-title`} className="space-y-3">
      <div>
        <h3 id={`portfolio-${kind}-title`} className="flex items-center gap-2 font-medium">
          {isRisk ? <ShieldAlert className="h-4 w-4 text-red-600" aria-hidden="true" /> : <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />}
          {isRisk ? "Riscos" : "Oportunidades"}
        </h3>
        <p className="text-xs text-muted-foreground">{isRisk ? "Ameaças que exigem mitigação." : "Possibilidades que merecem avanço."}</p>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
          {isRisk ? "Nenhum risco estruturado para este cliente." : "Nenhuma oportunidade estruturada para este cliente."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const owner = managers.find((manager) => manager.id === item.owner_manager_id);
            const score = getPriorityScore(item);
            const closed = isPortfolioItemClosed(item);
            const overdue = isPortfolioItemOverdue(item);
            return (
              <article key={item.id} className={`rounded-xl border p-4 ${closed ? "bg-muted/25 opacity-75" : "bg-background"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{item.title}</p>
                    {item.description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="icon-sm" aria-label={`Editar ${kind}: ${item.title}`} onClick={() => onEdit(item)}>
                      <Pencil aria-hidden="true" />
                    </Button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className={PORTFOLIO_ITEM_STATUS[item.status].badge}>{PORTFOLIO_ITEM_STATUS[item.status].label}</Badge>
                  <Badge variant="outline">Prioridade {getPriorityLabel(score)} · {score}/9</Badge>
                  {overdue && <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Vencido</Badge>}
                </div>
                <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:gap-4">
                  <span className="flex items-center gap-1"><UserRound className="h-3.5 w-3.5" aria-hidden="true" />{owner?.name ?? "Responsável não encontrado"}</span>
                  <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{formatDate(item.target_date)}</span>
                  <span>Impacto {IMPACT_LABEL[item.impact].toLowerCase()} · Probabilidade {PROBABILITY_LABEL[item.probability].toLowerCase()}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ClientRiskOpportunitiesSection({
  clientId,
  defaultOwnerManagerId,
  items,
  managers,
  canManage,
}: {
  clientId: string;
  defaultOwnerManagerId: string | null;
  items: ClientRiskOpportunity[];
  managers: DeepManager[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClientRiskOpportunity | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const summary = summarizePortfolioItems(items);

  function openItem(item: ClientRiskOpportunity | null) {
    setEditingItem(item);
    setConfirmDelete(false);
    setError(null);
    setOpen(true);
  }

  function saveItem(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const value = (key: string) => String(formData.get(key) ?? "").trim();
        const payload = {
          kind: value("kind") as ClientPortfolioItemKind,
          title: value("title"),
          description: value("description") || null,
          impact: value("impact") as ClientPortfolioItemImpact,
          probability: value("probability") as ClientPortfolioItemProbability,
          owner_manager_id: value("owner_manager_id"),
          target_date: value("target_date"),
          status: value("status") as ClientPortfolioItemStatus,
        };
        const supabase = createClient();
        const { error: dbError } = editingItem
          ? await supabase.from("client_risk_opportunities").update(payload).eq("id", editingItem.id)
          : await supabase.from("client_risk_opportunities").insert({ client_id: clientId, ...payload });

        if (dbError) {
          setError("Não foi possível salvar o item. Tente novamente.");
          return;
        }

        setFeedback(editingItem ? "Item atualizado." : "Item adicionado à carteira.");
        setOpen(false);
        router.refresh();
      } catch {
        setError("Falha de conexão. Tente novamente.");
      }
    });
  }

  function deleteItem() {
    if (!editingItem) return;
    setError(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error: dbError } = await supabase.from("client_risk_opportunities").delete().eq("id", editingItem.id);
        if (dbError) {
          setError("Não foi possível remover o item. Tente novamente.");
          return;
        }
        setFeedback("Item removido da carteira.");
        setOpen(false);
        router.refresh();
      } catch {
        setError("Falha de conexão. Tente novamente.");
      }
    });
  }

  return (
    <Card aria-labelledby="risk-opportunities-title">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle id="risk-opportunities-title">Riscos e oportunidades</CardTitle>
            <CardDescription>Prioridades da conta com responsável, prazo e acompanhamento.</CardDescription>
          </div>
          {canManage && <Button size="sm" onClick={() => openItem(null)}><Plus aria-hidden="true" />Novo item</Button>}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {feedback && <p role="status" className="text-sm text-emerald-700">{feedback}</p>}
        <div className="grid gap-3 sm:grid-cols-3" aria-label="Resumo de riscos e oportunidades">
          <div className="rounded-xl bg-red-50 p-4"><p className="text-xs text-red-700">Riscos abertos</p><p className="mt-1 text-2xl font-semibold text-red-900">{summary.openRisks}</p></div>
          <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs text-emerald-700">Oportunidades abertas</p><p className="mt-1 text-2xl font-semibold text-emerald-900">{summary.openOpportunities}</p></div>
          <div className="rounded-xl bg-amber-50 p-4"><p className="text-xs text-amber-700">Itens vencidos</p><p className="mt-1 text-2xl font-semibold text-amber-900">{summary.overdue}</p></div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ItemList kind="risco" items={items} managers={managers} canManage={canManage} onEdit={openItem} />
          <ItemList kind="oportunidade" items={items} managers={managers} canManage={canManage} onEdit={openItem} />
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); setError(null); setConfirmDelete(false); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form action={saveItem} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar item da carteira" : "Novo risco ou oportunidade"}</DialogTitle>
              <DialogDescription>Registre o sinal e defina como a equipe deve acompanhá-lo.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={fieldClass} htmlFor="portfolio-kind">Tipo <span aria-hidden="true">*</span>
                <select id="portfolio-kind" name="kind" required defaultValue={editingItem?.kind ?? "risco"} className={selectClass}>
                  <option value="risco">Risco</option><option value="oportunidade">Oportunidade</option>
                </select>
              </label>
              <label className={fieldClass} htmlFor="portfolio-status">Status <span aria-hidden="true">*</span>
                <select id="portfolio-status" name="status" required defaultValue={editingItem?.status ?? "aberto"} className={selectClass}>
                  {Object.entries(PORTFOLIO_ITEM_STATUS).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
                </select>
              </label>
            </div>
            <label className={fieldClass} htmlFor="portfolio-title">Título <span aria-hidden="true">*</span>
              <Input id="portfolio-title" name="title" required minLength={3} maxLength={300} defaultValue={editingItem?.title ?? ""} />
            </label>
            <label className={fieldClass} htmlFor="portfolio-description">Descrição
              <Textarea id="portfolio-description" name="description" minLength={3} maxLength={1000} defaultValue={editingItem?.description ?? ""} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={fieldClass} htmlFor="portfolio-impact">Impacto <span aria-hidden="true">*</span>
                <select id="portfolio-impact" name="impact" required defaultValue={editingItem?.impact ?? "medio"} className={selectClass}>
                  {Object.entries(IMPACT_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className={fieldClass} htmlFor="portfolio-probability">Probabilidade <span aria-hidden="true">*</span>
                <select id="portfolio-probability" name="probability" required defaultValue={editingItem?.probability ?? "media"} className={selectClass}>
                  {Object.entries(PROBABILITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Prioridade = impacto × probabilidade, em uma escala de 1 a 9.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={fieldClass} htmlFor="portfolio-owner">Responsável <span aria-hidden="true">*</span>
                <select id="portfolio-owner" name="owner_manager_id" required defaultValue={editingItem?.owner_manager_id ?? defaultOwnerManagerId ?? ""} className={selectClass}>
                  <option value="">Selecionar</option>
                  {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
                </select>
              </label>
              <label className={fieldClass} htmlFor="portfolio-target-date">Data-alvo <span aria-hidden="true">*</span>
                <Input id="portfolio-target-date" name="target_date" type="date" required defaultValue={editingItem?.target_date ?? ""} />
              </label>
            </div>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {editingItem && confirmDelete && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Remover este item definitivamente? Essa ação não pode ser desfeita.</p>}
            <DialogFooter className="flex-wrap sm:justify-between">
              {editingItem && (confirmDelete
                ? <Button type="button" variant="destructive" onClick={deleteItem} disabled={pending}><Trash2 aria-hidden="true" />Confirmar remoção</Button>
                : <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}><Trash2 aria-hidden="true" />Remover</Button>)}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar item"}</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
