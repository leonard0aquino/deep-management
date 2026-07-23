"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Link2, Save, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { SavedDashboardView } from "@/lib/types/database";

type ExportRow = Record<string, string | number>;
const ALLOWED_FILTERS = new Set(["period", "client", "product", "manager", "status", "view"]);

export function queryToFilters(query: string) {
  return Object.fromEntries([...new URLSearchParams(query)].filter(([key]) => ALLOWED_FILTERS.has(key)));
}

export function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function SavedDashboardViews({
  initialViews,
  userId,
  currentQuery,
  exportRows,
}: {
  initialViews: SavedDashboardView[];
  userId: string;
  currentQuery: string;
  exportRows: ExportRow[];
}) {
  const router = useRouter();
  const [views, setViews] = useState(initialViews);
  const [selectedId, setSelectedId] = useState(initialViews[0]?.id ?? "");
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selected = views.find((view) => view.id === selectedId);

  function saveView() {
    const trimmed = name.trim();
    if (!trimmed) return setFeedback("Informe um nome para salvar a visão.");
    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("saved_dashboard_views").insert({ user_id: userId, name: trimmed, filters: queryToFilters(currentQuery) }).select().single();
      if (error || !data) return setFeedback(error?.message ?? "Não foi possível salvar a visão.");
      setViews((current) => [data, ...current]);
      setSelectedId(data.id);
      setName("");
      setFeedback("Visão salva.");
    });
  }

  function applyView() {
    if (!selected) return;
    const query = new URLSearchParams(selected.filters).toString();
    router.replace(query ? `/?${query}` : "/");
  }

  function renameView() {
    const trimmed = name.trim();
    if (!selected || !trimmed) return setFeedback("Selecione uma visão e informe o novo nome.");
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("saved_dashboard_views").update({ name: trimmed }).eq("id", selected.id);
      if (error) return setFeedback(error.message);
      setViews((current) => current.map((view) => view.id === selected.id ? { ...view, name: trimmed } : view));
      setName("");
      setFeedback("Visão renomeada.");
    });
  }

  function makeDefault() {
    if (!selected) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("saved_dashboard_views").update({ is_default: true }).eq("id", selected.id);
      if (error) return setFeedback(error.message);
      setViews((current) => current.map((view) => ({ ...view, is_default: view.id === selected.id })));
      setFeedback("Visão padrão atualizada.");
    });
  }

  function deleteView() {
    if (!selected) return;
    if (!window.confirm(`Excluir a visão “${selected.name}”?`)) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("saved_dashboard_views").delete().eq("id", selected.id);
      if (error) return setFeedback(error.message);
      const next = views.filter((view) => view.id !== selected.id);
      setViews(next);
      setSelectedId(next[0]?.id ?? "");
      setFeedback("Visão excluída.");
    });
  }

  async function shareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setFeedback("Link copiado para a área de transferência.");
    } catch {
      setFeedback("Não foi possível copiar o link. Copie a URL do navegador.");
    }
  }

  function exportCsv() {
    if (exportRows.length === 0) return setFeedback("Não há dados no recorte para exportar.");
    const headers = Object.keys(exportRows[0]);
    const csv = [headers.map(csvCell).join(","), ...exportRows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cockpit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setFeedback(`${exportRows.length} linhas exportadas.`);
  }

  return (
    <section aria-label="Visões salvas e compartilhamento" className="rounded-xl border bg-white p-3">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
        <select aria-label="Visão salva" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="h-9 min-w-48 rounded-lg border bg-white px-2.5 text-[12px]">
          <option value="">Visões salvas</option>
          {views.map((view) => <option key={view.id} value={view.id}>{view.is_default ? "★ " : ""}{view.name}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={applyView} disabled={!selected}>Aplicar</Button>
        <Input aria-label="Nome da visão" placeholder={selected ? "Novo nome ou nova visão" : "Nome da nova visão"} value={name} onChange={(event) => setName(event.target.value)} className="h-9 max-w-64 text-[12px]" />
        <Button size="sm" onClick={saveView} disabled={isPending}><Save aria-hidden="true" /> Salvar atual</Button>
        {selected && <>
          <Button variant="ghost" size="sm" onClick={renameView} disabled={isPending || !name.trim()}>Renomear</Button>
          <Button variant="ghost" size="icon-sm" onClick={makeDefault} disabled={isPending || selected.is_default} aria-label="Definir visão como padrão" title="Definir como padrão"><Star aria-hidden="true" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={deleteView} disabled={isPending} aria-label="Excluir visão" title="Excluir visão"><Trash2 aria-hidden="true" /></Button>
        </>}
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={shareLink}><Link2 aria-hidden="true" /> Copiar link</Button>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download aria-hidden="true" /> Exportar CSV</Button>
      </div>
      {feedback && <p className="mt-2 text-[11px] text-muted-foreground" role="status">{feedback}</p>}
    </section>
  );
}
