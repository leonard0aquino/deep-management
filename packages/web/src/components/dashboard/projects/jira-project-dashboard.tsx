"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Tv, Upload } from "lucide-react";
import { importJiraCsv } from "@/app/(app)/projects/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JiraImportBatch, JiraIssue, JiraProject } from "@/lib/types/database";
import { analyzeJiraCsv, buildJiraProjectDashboard, jiraAssigneeIdentity, type JiraFilters, type JiraProjectKey } from "@/services/jira-import";

const importedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const sourceDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

function options(issues: JiraIssue[], field: "priority" | "issue_type" | "status") {
  return [...new Set(issues.map((issue) => issue[field]).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function JiraProjectDashboard({ project, issues, batches, canImport, referenceDate, projects, selectedProjectKey }: {
  project: JiraProject | null;
  issues: JiraIssue[];
  batches: JiraImportBatch[];
  canImport: boolean;
  referenceDate: string;
  projects: Record<JiraProjectKey, string>;
  selectedProjectKey: JiraProjectKey;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<JiraFilters>({ period: "all" });
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const fileReadSequence = useRef(0);
  const [pending, startTransition] = useTransition();
  const analysis = useMemo(() => csv ? analyzeJiraCsv(csv) : null, [csv]);
  const dashboard = useMemo(() => buildJiraProjectDashboard(issues, referenceDate, filters), [filters, issues, referenceDate]);
  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    for (const issue of issues) {
      const identity = jiraAssigneeIdentity(issue);
      if (identity !== "__unassigned__") map.set(identity, issue.assignee_name ?? issue.assignee_account_id ?? identity);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [issues]);
  const lastBatch = batches[0];

  async function selectFile(file?: File) {
    const sequence = ++fileReadSequence.current;
    setMessage(null);
    if (!file) return;
    if (!file.name.toLocaleLowerCase("pt-BR").endsWith(".csv") || file.size > 5_000_000) {
      setFileName(""); setCsv("");
      setMessage({ tone: "error", text: "Selecione um CSV de até 5 MB." });
      return;
    }
    setFileName(file.name);
    setCsv("");
    const content = await file.text();
    if (sequence === fileReadSequence.current) setCsv(content);
  }

  function confirmImport() {
    if (!analysis || analysis.issues.length || !analysis.rows.length) return;
    startTransition(async () => {
      const result = await importJiraCsv(fileName, csv);
      if (!result.ok) return setMessage({ tone: "error", text: result.error });
      setMessage({ tone: "success", text: `${result.totalRows} cards processados: ${result.insertedRows} novos e ${result.updatedRows} atualizados.` });
      setFileName(""); setCsv(""); router.refresh();
    });
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-lg font-semibold">{project?.name ?? projects[selectedProjectKey]} <span className="text-sm font-normal text-muted-foreground">· {selectedProjectKey}</span></p><p className="mt-1 text-xs text-muted-foreground">{lastBatch ? `Última importação em ${importedAt.format(new Date(lastBatch.imported_at))} · ${lastBatch.total_rows} cards` : "Aguardando a primeira importação do Jira."}</p></div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="jira-project">Projeto Jira</label>
        <select id="jira-project" className="h-9 rounded-md border bg-background px-3 text-sm" value={selectedProjectKey} onChange={(event) => { setFilters({ period: "all" }); setMessage(null); router.push(`/projects?project=${event.target.value}`); }}>
          {Object.entries(projects).map(([key, name]) => <option key={key} value={key}>{name} · {key}</option>)}
        </select>
        <Button variant="outline" render={<Link href={`/projects/tv?project=${selectedProjectKey}`} />} nativeButton={false}><Tv /> TV de Desenvolvimento</Button>
      </div>
    </div>

    {canImport && <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Importar Jira</CardTitle><CardDescription>O projeto é identificado pela chave dos cards. Reimportações atualizam os registros existentes sem duplicar.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm font-medium hover:bg-muted/40"><Upload className="h-4 w-4" />{fileName || "Selecionar CSV do Jira"}<input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => void selectFile(event.target.files?.[0])} /></label>
          <Button disabled={pending || !analysis?.rows.length || Boolean(analysis?.issues.length)} onClick={confirmImport}>{pending ? "Importando..." : `Importar ${analysis?.rows.length ?? 0} cards`}</Button>
        </div>
        {analysis && <div className="flex flex-wrap gap-2"><Badge variant="outline">{analysis.rows.length} cards</Badge><Badge variant="outline">Projeto {analysis.projectKey ?? "não identificado"}</Badge><Badge variant="outline" className={analysis.issues.length ? "border-red-200 text-red-700" : "border-emerald-200 text-emerald-700"}>{analysis.issues.length ? `${analysis.issues.length} erro(s)` : "Arquivo válido"}</Badge></div>}
        {analysis?.issues.slice(0, 3).map((issue, index) => <p key={`${issue.row}-${issue.field}-${index}`} className="text-sm text-destructive">Linha {issue.row}, {issue.field}: {issue.message}</p>)}
        {message && <Alert variant={message.tone === "error" ? "destructive" : "default"}>{message.tone === "error" ? <AlertTriangle /> : <CheckCircle2 />}<AlertTitle>{message.tone === "error" ? "Importação não concluída" : "Importação concluída"}</AlertTitle><AlertDescription>{message.text}</AlertDescription></Alert>}
      </CardContent>
    </Card>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Indicadores do projeto">
      {([['Total', dashboard.kpis.total], ['Concluídos', dashboard.kpis.completed], ['Em aberto', dashboard.kpis.open], ['Vencidos', dashboard.kpis.overdue], ['Sem responsável', dashboard.kpis.unassigned]] as const).map(([label, value]) => <Card key={label}><CardContent className="p-5"><p className={`text-4xl font-semibold tabular-nums ${label === "Vencidos" && value ? "text-rose-600" : ""}`}>{value}</p><p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{label}</p></CardContent></Card>)}
    </section>

    <Card><CardHeader><CardTitle>Filtros</CardTitle><CardDescription>O período considera a última atualização recebida do Jira.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Filter label="Período" value={filters.period ?? "all"} onChange={(period) => setFilters((current) => ({ ...current, period: period as JiraFilters["period"] }))} values={[["all", "Todo o histórico"], ["today", "Hoje"], ["7", "Últimos 7 dias"], ["30", "Últimos 30 dias"]]} />
      <Filter label="Responsável" value={filters.assignee ?? ""} onChange={(assignee) => setFilters((current) => ({ ...current, assignee }))} values={[["", "Todos"], ["__unassigned__", "Sem responsável"], ...assignees]} />
      <Filter label="Prioridade" value={filters.priority ?? ""} onChange={(priority) => setFilters((current) => ({ ...current, priority }))} values={[["", "Todas"], ...options(issues, "priority").map((value) => [value, value] as [string, string])]} />
      <Filter label="Tipo" value={filters.issueType ?? ""} onChange={(issueType) => setFilters((current) => ({ ...current, issueType }))} values={[["", "Todos"], ...options(issues, "issue_type").map((value) => [value, value] as [string, string])]} />
      <Filter label="Status" value={filters.status ?? ""} onChange={(status) => setFilters((current) => ({ ...current, status }))} values={[["", "Todos"], ...options(issues, "status").map((value) => [value, value] as [string, string])]} />
    </CardContent></Card>

    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.7fr]">
      <Card><CardHeader><CardTitle>Distribuição por responsável</CardTitle><CardDescription>Volume atual de cards por pessoa; não representa produtividade.</CardDescription></CardHeader><CardContent className="space-y-4">{dashboard.assignees.slice(0, 15).map((assignee) => <div key={assignee.id}><div className="flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium">{assignee.name}</span><span className="tabular-nums text-muted-foreground">{assignee.open} abertos · {assignee.completed} concluídos</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${dashboard.kpis.total ? Math.max(3, assignee.total / dashboard.kpis.total * 100) : 0}%` }} /></div></div>)}{!dashboard.assignees.length && <p className="py-10 text-center text-sm text-muted-foreground">Nenhum card para os filtros atuais.</p>}</CardContent></Card>

      <Card><CardHeader><CardTitle>Cards do projeto</CardTitle><CardDescription>{dashboard.issues.length} resultado(s). A lista exibe até 100 cards.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Chave</TableHead><TableHead>Resumo</TableHead><TableHead>Status</TableHead><TableHead>Responsável</TableHead><TableHead>Atualizado</TableHead><TableHead>Prazo</TableHead></TableRow></TableHeader><TableBody>{dashboard.issues.slice(0, 100).map((issue) => <TableRow key={issue.id}><TableCell className="font-medium">{issue.issue_key}</TableCell><TableCell className="max-w-[360px] truncate">{issue.summary}</TableCell><TableCell><Badge variant="outline">{issue.status}</Badge></TableCell><TableCell>{issue.assignee_name ?? "Sem responsável"}</TableCell><TableCell>{issue.source_updated_at ? sourceDate.format(new Date(issue.source_updated_at)) : "—"}</TableCell><TableCell className={issue.due_at && issue.due_at < referenceDate && !issue.status_category.toLocaleLowerCase("pt-BR").includes("conclu") ? "font-medium text-rose-600" : ""}>{issue.due_at ? sourceDate.format(new Date(`${issue.due_at}T12:00:00Z`)) : "—"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    </div>
  </div>;
}

function Filter({ label, value, values, onChange }: { label: string; value: string; values: Array<[string, string]>; onChange: (value: string) => void }) {
  return <label className="space-y-1.5 text-sm font-medium">{label}<select className="h-9 w-full rounded-md border bg-background px-3 text-sm font-normal" value={value} onChange={(event) => onChange(event.target.value)}>{values.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}
