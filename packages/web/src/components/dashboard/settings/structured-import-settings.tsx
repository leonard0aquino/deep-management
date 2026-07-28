"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { executeStructuredImport } from "@/app/(app)/admin/import-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { analyzeImport, buildErrorReport, IMPORT_COLUMNS, type ImportAnalysis, type ImportReferenceData, type StructuredImportKind } from "@/services/structured-import";

const KIND_LABELS: Record<StructuredImportKind, string> = {
  clients: "Clientes",
  people: "Pessoas",
  contracts: "Contratos e produtos",
  interactions: "Histórico de interações",
};

export function StructuredImportSettings({ references }: { references: ImportReferenceData }) {
  const [kind, setKind] = useState<StructuredImportKind>("clients");
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const columns = useMemo(() => IMPORT_COLUMNS[kind].join(","), [kind]);

  function changeKind(next: StructuredImportKind) {
    setKind(next);
    setCsv(""); setFileName(""); setAnalysis(null); setMessage(null);
  }

  async function selectFile(file?: File) {
    setMessage(null); setAnalysis(null);
    if (!file) return;
    if (file.size > 5_000_000) {
      setMessage({ tone: "error", text: "O arquivo deve ter até 5 MB." });
      return;
    }
    const content = await file.text();
    setFileName(file.name);
    setCsv(content);
    setAnalysis(analyzeImport(kind, content, references));
  }

  function downloadErrors() {
    if (!analysis?.issues.length) return;
    const blob = new Blob([buildErrorReport(analysis.issues)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `erros-${kind}.csv`; anchor.click();
    URL.revokeObjectURL(url);
  }

  function confirmImport() {
    if (!analysis || analysis.issues.length > 0 || analysis.validRows.length === 0) return;
    setMessage(null);
    startTransition(async () => {
      const result = await executeStructuredImport(kind, fileName, csv);
      if (!result.ok) setMessage({ tone: "error", text: result.error });
      else {
        setMessage({ tone: "success", text: `${result.importedRows} registro(s) importado(s) com sucesso.` });
        setCsv(""); setFileName(""); setAnalysis(null);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Central de Importação</CardTitle>
        <CardDescription>Analise o CSV, revise erros e confirme somente quando o lote estiver válido.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2" aria-label="Modalidade de importação">
          {(Object.keys(KIND_LABELS) as StructuredImportKind[]).map((value) => (
            <Button key={value} type="button" variant={kind === value ? "default" : "outline"} onClick={() => changeKind(value)}>
              {KIND_LABELS[value]}
            </Button>
          ))}
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm font-medium">Colunas do modelo</p>
          <code className="mt-2 block overflow-x-auto text-xs text-muted-foreground">{columns}</code>
        </div>

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-sm font-medium hover:bg-muted/40">
          <Upload className="h-4 w-4" />
          {fileName || "Selecionar arquivo CSV (até 5 MB e 5.000 linhas)"}
          <input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => void selectFile(event.target.files?.[0])} />
        </label>

        {message && (
          <Alert variant={message.tone === "error" ? "destructive" : "default"}>
            {message.tone === "error" ? <AlertTriangle /> : <CheckCircle2 />}
            <AlertTitle>{message.tone === "error" ? "Importação não concluída" : "Importação concluída"}</AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {analysis && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{analysis.rows.length} linhas</Badge>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{analysis.validRows.length} válidas</Badge>
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">{analysis.invalidRows.length} inválidas</Badge>
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">{analysis.duplicateRows.length} duplicadas</Badge>
            </div>

            {analysis.issues.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">Erros encontrados</p>
                  <Button type="button" variant="outline" size="sm" onClick={downloadErrors}><Download />Baixar relatório</Button>
                </div>
                <div className="max-h-72 overflow-auto rounded-xl border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Linha</TableHead><TableHead>Campo</TableHead><TableHead>Motivo</TableHead></TableRow></TableHeader>
                    <TableBody>{analysis.issues.slice(0, 100).map((issue, index) => (
                      <TableRow key={`${issue.row}-${issue.field}-${index}`}><TableCell>{issue.row}</TableCell><TableCell>{issue.field}</TableCell><TableCell>{issue.message}</TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="button" disabled={isPending || analysis.issues.length > 0 || analysis.validRows.length === 0} onClick={confirmImport}>
                {isPending ? "Importando..." : `Confirmar ${analysis.validRows.length} registro(s)`}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
