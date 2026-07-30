"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreatableSelect } from "./creatable-select";
import { createClient } from "@/lib/supabase/client";
import { revalidateDashboardCache } from "@/lib/actions/revalidate-dashboard";
import { INTERACTION_TYPE_CONFIG } from "@/lib/interaction-type";
import { businessDateIso } from "@/lib/local-date";
import type {
  Client,
  ClientContact,
  ClientProduct,
  CustomerSentiment,
  DeepManager,
  InteractionTemplate,
  InteractionType,
  InteractionView,
  Product,
  TopicTag,
  Link,
} from "@/lib/types/database";

const INTERACTION_TYPES = Object.keys(INTERACTION_TYPE_CONFIG) as InteractionType[];
const SENTIMENT_OPTIONS: Array<{ value: CustomerSentiment; label: string }> = [
  { value: "positive", label: "Positivo" },
  { value: "neutral", label: "Neutro" },
  { value: "negative", label: "Negativo" },
];
const UNREPORTED_SENTIMENT = "unreported";

function optionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

function parseParticipants(value: string): string[] {
  return [...new Set(value.split(",").map((name) => name.trim()).filter(Boolean))];
}

function normalizeLinks(links: Link[]): Link[] {
  return links
    .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
    .filter((link) => link.label && link.url);
}

function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `produto-${Date.now()}`
  );
}

export function ownerForCombination(clientProducts: ClientProduct[], clientId?: string, productId?: string): string {
  if (!clientId || !productId) return "";
  return clientProducts.find((item) => item.active && item.client_id === clientId && item.product_id === productId)?.owner_manager_id ?? "";
}

export function InteractionFormDialog({
  open,
  onOpenChange,
  clients,
  products,
  managers,
  contacts,
  clientProducts = [],
  editing,
  initialClientId,
  initialProductId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  products: Product[];
  managers: DeepManager[];
  contacts: ClientContact[];
  clientProducts?: ClientProduct[];
  editing: InteractionView | null;
  initialClientId?: string;
  initialProductId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [clientsList, setClientsList] = useState(clients);
  const [productsList, setProductsList] = useState(products);
  const [managersList, setManagersList] = useState(managers);
  const [contactsList, setContactsList] = useState(contacts);

  const [clientId, setClientId] = useState(editing?.client_id ?? "");
  const [productId, setProductId] = useState(editing?.product_id ?? "");
  const [managerId, setManagerId] = useState(editing?.manager_id ?? ownerForCombination(clientProducts, initialClientId, initialProductId));
  const [contactId, setContactId] = useState(editing?.contact_id ?? "");
  const [topic, setTopic] = useState(editing?.topic ?? "");
  const [relevance, setRelevance] = useState(String(editing?.relevance ?? 3));
  const [occurredAt, setOccurredAt] = useState(editing?.occurred_at ?? "");
  const [interactionType, setInteractionType] = useState(editing?.interaction_type ?? "meeting");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [decisions, setDecisions] = useState(editing?.decisions ?? "");
  const [customerSentiment, setCustomerSentiment] = useState<CustomerSentiment | "">(
    editing?.customer_sentiment ?? "",
  );
  const [risks, setRisks] = useState(editing?.risks ?? "");
  const [opportunities, setOpportunities] = useState(editing?.opportunities ?? "");
  const [nextStep, setNextStep] = useState(editing?.next_step ?? "");
  const [nextStepOwner, setNextStepOwner] = useState(editing?.next_step_owner ?? "");
  const [nextStepDueDate, setNextStepDueDate] = useState(editing?.next_step_due_date ?? "");
  const [additionalParticipants, setAdditionalParticipants] = useState(
    editing?.additional_participants?.join(", ") ?? "",
  );
  const [links, setLinks] = useState<Link[]>(editing?.links ?? []);
  const [confidential, setConfidential] = useState(editing?.confidential ?? false);

  // Resync local lists whenever the dialog transitions to open, so newly
  // created rows from a previous session don't linger stale. Adjusting state
  // during render (React's recommended pattern) instead of in an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setClientsList(clients);
      setProductsList(products);
      setManagersList(managers);
      setContactsList(contacts);
      if (editing) {
        setClientId(editing.client_id);
        setProductId(editing.product_id);
        setManagerId(editing.manager_id ?? "");
        setContactId(editing.contact_id ?? "");
        setTopic(editing.topic);
        setRelevance(String(editing.relevance));
        setOccurredAt(editing.occurred_at);
        setInteractionType(editing.interaction_type);
        setNotes(editing.notes ?? "");
        setDecisions(editing.decisions ?? "");
        setCustomerSentiment(editing.customer_sentiment ?? "");
        setRisks(editing.risks ?? "");
        setOpportunities(editing.opportunities ?? "");
        setNextStep(editing.next_step ?? "");
        setNextStepOwner(editing.next_step_owner ?? "");
        setNextStepDueDate(editing.next_step_due_date ?? "");
        setAdditionalParticipants((editing.additional_participants ?? []).join(", "));
        setLinks(editing.links ?? []);
        setConfidential(editing.confidential ?? false);
      } else {
        setClientId(initialClientId ?? "");
        setProductId(initialProductId ?? "");
        setManagerId(ownerForCombination(clientProducts, initialClientId, initialProductId));
        setContactId("");
        setTopic("");
        setRelevance("3");
        setOccurredAt("");
        setInteractionType("meeting");
        setNotes("");
        setDecisions("");
        setCustomerSentiment("");
        setRisks("");
        setOpportunities("");
        setNextStep("");
        setNextStepOwner("");
        setNextStepDueDate("");
        setAdditionalParticipants("");
        setLinks([]);
        setConfidential(false);
      }
    }
  }

  const [topicTags, setTopicTags] = useState<TopicTag[]>([]);
  const [templates, setTemplates] = useState<InteractionTemplate[]>([]);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from("topic_tags")
      .select("*")
      .order("name")
      .then(({ data }) => setTopicTags(data ?? []));
    supabase
      .from("interaction_templates")
      .select("*")
      .order("name")
      .then(({ data }) => setTemplates(data ?? []));
  }, [open]);

  function applyTemplate(template: InteractionTemplate) {
    setInteractionType(template.interaction_type);
    setTopic(template.topic);
  }

  const filteredContacts = contactsList.filter((c) => c.client_id === clientId);

  function reset() {
    setClientId("");
    setProductId("");
    setManagerId("");
    setContactId("");
    setTopic("");
    setRelevance("3");
    setOccurredAt("");
    setInteractionType("meeting");
    setNotes("");
    setDecisions("");
    setCustomerSentiment("");
    setRisks("");
    setOpportunities("");
    setNextStep("");
    setNextStepOwner("");
    setNextStepDueDate("");
    setAdditionalParticipants("");
    setLinks([]);
    setConfidential(false);
    setError(null);
  }

  function updateLink(index: number, field: keyof Link, value: string) {
    setLinks((current) =>
      current.map((link, currentIndex) =>
        currentIndex === index ? { ...link, [field]: value } : link,
      ),
    );
  }

  async function createClientRow(name: string) {
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("clients")
      .insert({ name })
      .select()
      .single();
    if (dbError || !data) {
      setError(dbError?.message ?? "Erro ao criar cliente.");
      return null;
    }
    setClientsList((prev) => [...prev, data]);
    return data;
  }

  async function createProductRow(name: string) {
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("products")
      .insert({ name, slug: slugify(name) })
      .select()
      .single();
    if (dbError || !data) {
      setError(dbError?.message ?? "Erro ao criar produto.");
      return null;
    }
    setProductsList((prev) => [...prev, data]);
    return data;
  }

  async function createManagerRow(name: string) {
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("deep_managers")
      .insert({ name })
      .select()
      .single();
    if (dbError || !data) {
      setError(dbError?.message ?? "Erro ao criar responsável.");
      return null;
    }
    setManagersList((prev) => [...prev, data]);
    return data;
  }

  async function createContactRow(name: string) {
    if (!clientId) {
      setError("Selecione um cliente antes de adicionar um contato.");
      return null;
    }
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("client_contacts")
      .insert({ client_id: clientId, name })
      .select()
      .single();
    if (dbError || !data) {
      setError(dbError?.message ?? "Erro ao criar contato.");
      return null;
    }
    setContactsList((prev) => [...prev, data]);
    return data;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!clientId || !productId || !managerId || !topic || !occurredAt) {
      setError("Preencha cliente, produto, responsável, tema e data.");
      return;
    }

    if (occurredAt > businessDateIso()) {
      setError("A data da interação não pode estar no futuro.");
      return;
    }

    const incompleteLink = links.find(
      (link) => Boolean(link.label.trim()) !== Boolean(link.url.trim()),
    );
    if (incompleteLink) {
      setError("Preencha o nome e a URL de cada link ou remova a linha incompleta.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const payload = {
        client_id: clientId,
        product_id: productId,
        manager_id: managerId || null,
        contact_id: contactId || null,
        topic,
        relevance: Number(relevance),
        occurred_at: occurredAt,
        interaction_type: interactionType as (typeof INTERACTION_TYPES)[number],
        notes: optionalText(notes),
        decisions: optionalText(decisions),
        customer_sentiment: customerSentiment || null,
        risks: optionalText(risks),
        opportunities: optionalText(opportunities),
        next_step: optionalText(nextStep),
        next_step_owner: optionalText(nextStepOwner),
        next_step_due_date: nextStepDueDate || null,
        additional_participants: parseParticipants(additionalParticipants),
        links: normalizeLinks(links),
        confidential,
      };

      const { error: dbError } = editing
        ? await supabase.from("interactions").update(payload).eq("id", editing.id)
        : await supabase.from("interactions").insert(payload);

      if (dbError) {
        setError(dbError.message);
        return;
      }

      onOpenChange(false);
      reset();
      await revalidateDashboardCache();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar interação" : "Nova interação"}</DialogTitle>
          <DialogDescription>
            Registre o acompanhamento de relacionamento com o cliente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {templates.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                >
                  {template.name}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Cliente">
              <CreatableSelect
                items={clientsList}
                value={clientId}
                onValueChange={(id) => {
                  setClientId(id);
                  setContactId("");
                  setManagerId(ownerForCombination(clientProducts, id, productId));
                }}
                onCreate={createClientRow}
                createLabel="Adicionar novo cliente"
              />
            </Field>

            <Field label="Produto">
              <CreatableSelect
                items={productsList}
                value={productId}
                onValueChange={(id) => {
                  setProductId(id);
                  setManagerId(ownerForCombination(clientProducts, clientId, id));
                }}
                onCreate={createProductRow}
                createLabel="Adicionar novo produto"
              />
            </Field>

            <Field label="Responsável AISphere">
              <CreatableSelect
                items={managersList}
                value={managerId}
                onValueChange={setManagerId}
                onCreate={createManagerRow}
                createLabel="Adicionar novo responsável"
              />
              <p className="text-[11px] text-muted-foreground">Obrigatório. O responsável definido para este cliente e produto é sugerido automaticamente.</p>
            </Field>

            <Field label="Contato no cliente">
              <CreatableSelect
                items={filteredContacts}
                value={contactId}
                onValueChange={setContactId}
                onCreate={createContactRow}
                createLabel="Adicionar novo contato"
                disabled={!clientId}
              />
            </Field>

            <Field label="Tipo">
              <Select
                value={interactionType}
                onValueChange={(v) => setInteractionType((v ?? "meeting") as typeof interactionType)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(v: string | null) =>
                      v ? INTERACTION_TYPE_CONFIG[v as InteractionType].label : ""
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {INTERACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {INTERACTION_TYPE_CONFIG[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Data do contato">
              <Input
                type="date"
                value={occurredAt}
                max={businessDateIso()}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Registre interações relevantes em até 24 horas.</p>
            </Field>

            <Field label="Tema" className="col-span-2">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Renovação"
                list="topic-suggestions"
              />
              <datalist id="topic-suggestions">
                {topicTags.map((tag) => (
                  <option key={tag.id} value={tag.name} />
                ))}
              </datalist>
            </Field>

            <Field label="Relevância (1-5)">
              <Select value={relevance} onValueChange={(v) => setRelevance(v ?? "3")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <fieldset className="space-y-4 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">Memória da conversa</legend>
            <Field label="Resumo e notas">
              <Textarea
                aria-label="Resumo e notas"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Contexto relevante, percepções e informações compartilhadas"
              />
            </Field>
            <Field label="Decisões tomadas">
              <Textarea
                aria-label="Decisões tomadas"
                value={decisions}
                onChange={(event) => setDecisions(event.target.value)}
                placeholder="O que ficou decidido nesta interação"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Sentimento do cliente">
                <Select
                  value={customerSentiment || UNREPORTED_SENTIMENT}
                  onValueChange={(value) =>
                    setCustomerSentiment(
                      value === UNREPORTED_SENTIMENT ? "" : (value as CustomerSentiment),
                    )
                  }
                >
                  <SelectTrigger aria-label="Sentimento do cliente">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNREPORTED_SENTIMENT}>Não informado</SelectItem>
                    {SENTIMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Participantes adicionais">
                <Input
                  aria-label="Participantes adicionais"
                  value={additionalParticipants}
                  onChange={(event) => setAdditionalParticipants(event.target.value)}
                  placeholder="Ana Silva, João Souza"
                />
                <p className="text-[11px] text-muted-foreground">Separe os nomes por vírgula.</p>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Riscos identificados">
                <Textarea
                  aria-label="Riscos identificados"
                  value={risks}
                  onChange={(event) => setRisks(event.target.value)}
                />
              </Field>
              <Field label="Oportunidades identificadas">
                <Textarea
                  aria-label="Oportunidades identificadas"
                  value={opportunities}
                  onChange={(event) => setOpportunities(event.target.value)}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">Próximo passo</legend>
            <Field label="Ação combinada">
              <Textarea
                aria-label="Ação combinada"
                value={nextStep}
                onChange={(event) => setNextStep(event.target.value)}
                placeholder="Descreva o compromisso assumido"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Responsável pelo próximo passo">
                <Input
                  aria-label="Responsável pelo próximo passo"
                  value={nextStepOwner}
                  onChange={(event) => setNextStepOwner(event.target.value)}
                />
              </Field>
              <Field label="Prazo do próximo passo">
                <Input
                  aria-label="Prazo do próximo passo"
                  type="date"
                  value={nextStepDueDate}
                  onChange={(event) => setNextStepDueDate(event.target.value)}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">Links e documentos</legend>
            {links.map((link, index) => (
              <div key={index} className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
                <Input
                  aria-label={`Nome do link ${index + 1}`}
                  value={link.label}
                  onChange={(event) => updateLink(index, "label", event.target.value)}
                  placeholder="Nome do documento"
                />
                <Input
                  aria-label={`URL do link ${index + 1}`}
                  type="url"
                  value={link.url}
                  onChange={(event) => updateLink(index, "url", event.target.value)}
                  placeholder="https://"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover link ${index + 1}`}
                  onClick={() => setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLinks((current) => [...current, { label: "", url: "" }])}
            >
              <Plus /> Adicionar link
            </Button>
          </fieldset>

          <label className="flex items-start gap-3 rounded-xl border p-4 text-sm">
            <input
              aria-label="Interação confidencial"
              type="checkbox"
              checked={confidential}
              onChange={(event) => setConfidential(event.target.checked)}
              className="mt-0.5 size-4"
            />
            <span>
              <span className="block font-medium">Interação confidencial</span>
              <span className="text-xs text-muted-foreground">
                Sinaliza conteúdo sensível; as permissões atuais permanecem inalteradas.
              </span>
            </span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
