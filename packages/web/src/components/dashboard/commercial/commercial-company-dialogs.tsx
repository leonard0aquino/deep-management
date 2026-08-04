"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Client, ClientContact } from "@/lib/types/database";

type CreatedCompany = { company: Client; contact: ClientContact | null; warning?: string };

function normalizedName(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function CommercialCompanyDialog({
  open,
  onOpenChange,
  existingClients,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingClients: Client[];
  onCreated: (created: CreatedCompany) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const name = String(formData.get("company_name") ?? "").trim();
      const contactName = String(formData.get("contact_name") ?? "").trim();
      const existing = existingClients.find((client) => normalizedName(client.name) === normalizedName(name));
      if (existing) {
        setError(`A empresa ${existing.name} já está cadastrada. Selecione-a na lista.`);
        return;
      }

      const supabase = createClient();
      const companyResult = await supabase.from("clients").insert({
        name,
        segment: String(formData.get("segment") ?? "").trim() || null,
        client_kind: "prospect",
        active: true,
      }).select().single();
      if (companyResult.error || !companyResult.data) {
        setError(companyResult.error?.code === "23505"
          ? "Esta empresa já está cadastrada. Selecione-a na lista."
          : companyResult.error?.message ?? "Não foi possível criar a empresa.");
        return;
      }

      let contact: ClientContact | null = null;
      if (contactName) {
        const contactResult = await supabase.from("client_contacts").insert({
          client_id: companyResult.data.id,
          name: contactName,
          email: String(formData.get("contact_email") ?? "").trim() || null,
          phone: String(formData.get("contact_phone") ?? "").trim() || null,
        }).select().single();
        if (contactResult.error || !contactResult.data) {
          onCreated({
            company: companyResult.data,
            contact: null,
            warning: `Empresa criada, mas o contato não pôde ser salvo: ${contactResult.error?.message ?? "erro desconhecido"}`,
          });
          onOpenChange(false);
          return;
        }
        contact = contactResult.data;
      }

      onCreated({ company: companyResult.data, contact });
      onOpenChange(false);
    });
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <form action={save} className="space-y-4">
        <DialogHeader>
          <DialogTitle>Nova empresa</DialogTitle>
          <DialogDescription>A empresa será cadastrada como Prospect. O contato responsável é opcional e poderá ser complementado depois.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Empresa<Input name="company_name" required minLength={2} maxLength={160} /></label>
          <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Segmento<Input name="segment" maxLength={100} /></label>
          <p className="text-sm font-semibold sm:col-span-2">Contato responsável da empresa</p>
          <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Nome do contato<Input name="contact_name" maxLength={160} /></label>
          <label className="space-y-1.5 text-sm font-medium">E-mail<Input name="contact_email" type="email" maxLength={254} /></label>
          <label className="space-y-1.5 text-sm font-medium">Telefone<Input name="contact_phone" type="tel" maxLength={40} /></label>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Criando..." : "Criar empresa"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

export function CommercialContactDialog({
  open,
  onOpenChange,
  clientId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onCreated: (contact: ClientContact) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createClient().from("client_contacts").insert({
        client_id: clientId,
        name: String(formData.get("name") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim() || null,
        phone: String(formData.get("phone") ?? "").trim() || null,
      }).select().single();
      if (result.error || !result.data) {
        setError(result.error?.message ?? "Não foi possível criar o contato.");
        return;
      }
      onCreated(result.data);
      onOpenChange(false);
    });
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md"><form action={save} className="space-y-4">
      <DialogHeader><DialogTitle>Novo contato</DialogTitle><DialogDescription>Cadastre a pessoa responsável por esta empresa.</DialogDescription></DialogHeader>
      <label className="space-y-1.5 text-sm font-medium">Nome<Input name="name" required minLength={2} maxLength={160} /></label>
      <label className="space-y-1.5 text-sm font-medium">E-mail<Input name="email" type="email" maxLength={254} /></label>
      <label className="space-y-1.5 text-sm font-medium">Telefone<Input name="phone" type="tel" maxLength={40} /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Criando..." : "Criar contato"}</Button></DialogFooter>
    </form></DialogContent>
  </Dialog>;
}
