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
import type {
  Client,
  ClientContact,
  DeepManager,
  InteractionTemplate,
  InteractionType,
  InteractionView,
  Product,
  TopicTag,
} from "@/lib/types/database";

const INTERACTION_TYPES = Object.keys(INTERACTION_TYPE_CONFIG) as InteractionType[];

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

export function InteractionFormDialog({
  open,
  onOpenChange,
  clients,
  products,
  managers,
  contacts,
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
  const [managerId, setManagerId] = useState(editing?.manager_id ?? "");
  const [contactId, setContactId] = useState(editing?.contact_id ?? "");
  const [topic, setTopic] = useState(editing?.topic ?? "");
  const [relevance, setRelevance] = useState(String(editing?.relevance ?? 3));
  const [occurredAt, setOccurredAt] = useState(editing?.occurred_at ?? "");
  const [interactionType, setInteractionType] = useState(editing?.interaction_type ?? "meeting");

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
      } else {
        setClientId(initialClientId ?? "");
        setProductId(initialProductId ?? "");
        setManagerId("");
        setContactId("");
        setTopic("");
        setRelevance("3");
        setOccurredAt("");
        setInteractionType("meeting");
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
    setError(null);
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

    if (!clientId || !productId || !topic || !occurredAt) {
      setError("Preencha cliente, produto, tema e data.");
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
      <DialogContent className="sm:max-w-lg">
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

          <div className="grid grid-cols-2 gap-4">
            <Field label="Cliente">
              <CreatableSelect
                items={clientsList}
                value={clientId}
                onValueChange={(id) => {
                  setClientId(id);
                  setContactId("");
                }}
                onCreate={createClientRow}
                createLabel="Adicionar novo cliente"
              />
            </Field>

            <Field label="Produto">
              <CreatableSelect
                items={productsList}
                value={productId}
                onValueChange={setProductId}
                onCreate={createProductRow}
                createLabel="Adicionar novo produto"
              />
            </Field>

            <Field label="Responsável DEEP">
              <CreatableSelect
                items={managersList}
                value={managerId}
                onValueChange={setManagerId}
                onCreate={createManagerRow}
                createLabel="Adicionar novo responsável"
              />
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
                onChange={(e) => setOccurredAt(e.target.value)}
              />
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
