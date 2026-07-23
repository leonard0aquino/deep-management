"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import type { Client, ClientContact, Product } from "@/lib/types/database";

type Props =
  | { kind: "client"; item: Client }
  | { kind: "product"; item: Product }
  | { kind: "person"; item: ClientContact };

const fieldClass = "space-y-1 text-xs font-medium";

export function EntityEditDialog(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const supabase = createClient();
      const value = (key: string) => String(formData.get(key) ?? "").trim();
      let error: { message: string } | null = null;
      if (props.kind === "client") {
        ({ error } = await supabase.from("clients").update({
          name: value("name"), segment: value("segment") || null, logo_url: value("logo_url") || null,
          contract_value: value("contract_value") ? Number(value("contract_value")) : null,
          contract_renewal_date: value("contract_renewal_date") || null, active: formData.get("active") === "on",
        }).eq("id", props.item.id));
      } else if (props.kind === "product") {
        ({ error } = await supabase.from("products").update({
          name: value("name"), slug: value("slug"), color: value("color") || null, active: formData.get("active") === "on",
        }).eq("id", props.item.id));
      } else {
        ({ error } = await supabase.from("client_contacts").update({
          name: value("name"), role: value("role") || null, email: value("email") || null,
          phone: value("phone") || null, influence: value("influence") as ClientContact["influence"],
        }).eq("id", props.item.id));
      }
      if (error) return setFeedback(error.message);
      setFeedback("Alterações salvas.");
      router.refresh();
    });
  }

  const title = props.kind === "client" ? "Editar cliente" : props.kind === "product" ? "Editar produto" : "Editar pessoa";
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (nextOpen) setFeedback(null); }}>
      <DialogTrigger render={<Button variant="outline" size="sm" aria-label={`${title}: ${props.item.name}`} />}><Pencil /> Editar</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Atualize os dados e confirme para salvar.</DialogDescription></DialogHeader>
        <form action={submit} className="grid gap-3 sm:grid-cols-2">
          <label className={`${fieldClass} sm:col-span-2`}>Nome<Input name="name" required defaultValue={props.item.name} /></label>
          {props.kind === "client" && <>
            <label className={fieldClass}>Segmento<Input name="segment" defaultValue={props.item.segment ?? ""} /></label>
            <label className={fieldClass}>URL do logo<Input name="logo_url" type="url" defaultValue={props.item.logo_url ?? ""} /></label>
            <label className={fieldClass}>Valor do contrato<Input name="contract_value" type="number" min="0" step="0.01" defaultValue={props.item.contract_value ?? ""} /></label>
            <label className={fieldClass}>Renovação<Input name="contract_renewal_date" type="date" defaultValue={props.item.contract_renewal_date ?? ""} /></label>
            <label className="flex items-center gap-2 text-xs"><input name="active" type="checkbox" defaultChecked={props.item.active} /> Cliente ativo</label>
          </>}
          {props.kind === "product" && <>
            <label className={fieldClass}>Slug<Input name="slug" required defaultValue={props.item.slug} /></label>
            <label className={fieldClass}>Cor<Input name="color" type="color" defaultValue={props.item.color ?? "#2563eb"} /></label>
            <label className="flex items-center gap-2 text-xs"><input name="active" type="checkbox" defaultChecked={props.item.active} /> Produto ativo</label>
          </>}
          {props.kind === "person" && <>
            <label className={fieldClass}>Cargo<Input name="role" defaultValue={props.item.role ?? ""} /></label>
            <label className={fieldClass}>E-mail<Input name="email" type="email" defaultValue={props.item.email ?? ""} /></label>
            <label className={fieldClass}>Telefone<Input name="phone" defaultValue={props.item.phone ?? ""} /></label>
            <label className={fieldClass}>Influência<select name="influence" defaultValue={props.item.influence} className="h-8 w-full rounded-lg border bg-background px-2.5"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label>
          </>}
          {feedback && <p role="status" className={`text-xs sm:col-span-2 ${feedback === "Alterações salvas." ? "text-emerald-700" : "text-destructive"}`}>{feedback}</p>}
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
