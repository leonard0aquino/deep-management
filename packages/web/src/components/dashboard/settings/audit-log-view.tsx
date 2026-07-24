"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_TABLE_OPTIONS,
  auditEntriesToCsv,
  changedFields,
  describeAuditEntry,
} from "@/lib/audit-log";
import type { AuditLogEntry, UserProfile } from "@/lib/types/database";

const PAGE_SIZE = 30;
const ALL = "all";

const ACTION_BADGE: Record<string, string> = {
  INSERT: "bg-emerald-100 text-emerald-700 border-emerald-200",
  UPDATE: "bg-amber-100 text-amber-700 border-amber-200",
  DELETE: "bg-red-100 text-red-700 border-red-200",
};

export function AuditLogView({
  initialEntries,
  profiles,
}: {
  initialEntries: AuditLogEntry[];
  profiles: UserProfile[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState(ALL);
  const [tableName, setTableName] = useState(ALL);
  const [actor, setActor] = useState(ALL);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialEntries.length === PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);
  const skipNextFetch = useRef(true);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    (async () => {
      const { data, error: dbError } = await createClient().rpc("get_audit_log", {
        p_limit: PAGE_SIZE,
        p_offset: 0,
        p_action: action === ALL ? null : action,
        p_table_name: tableName === ALL ? null : tableName,
        p_actor: actor === ALL ? null : actor,
        p_search: search || null,
      });
      if (currentRequest !== requestId.current) return;
      if (dbError) {
        setError(dbError.message);
      } else {
        setEntries(data ?? []);
        setHasMore((data ?? []).length === PAGE_SIZE);
      }
      setLoading(false);
    })();
  }, [search, action, tableName, actor]);

  async function loadMore() {
    setLoading(true);
    const { data, error: dbError } = await createClient().rpc("get_audit_log", {
      p_limit: PAGE_SIZE,
      p_offset: entries.length,
      p_action: action === ALL ? null : action,
      p_table_name: tableName === ALL ? null : tableName,
      p_actor: actor === ALL ? null : actor,
      p_search: search || null,
    });
    setLoading(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setEntries((prev) => [...prev, ...(data ?? [])]);
    setHasMore((data ?? []).length === PAGE_SIZE);
  }

  function exportCsv() {
    const blob = new Blob([auditEntriesToCsv(entries)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditoria</CardTitle>
        <CardDescription>Últimas alterações em clientes, interações, produtos, gestores e contatos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar por usuário, tabela ou conteúdo..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="min-w-48 flex-1"
            aria-label="Buscar na auditoria"
          />
          <Select value={action} onValueChange={(value) => value && setAction(value)}>
            <SelectTrigger size="sm" className="w-32" aria-label="Filtrar por ação">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as ações</SelectItem>
              {AUDIT_ACTION_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tableName} onValueChange={(value) => value && setTableName(value)}>
            <SelectTrigger size="sm" className="w-40" aria-label="Filtrar por tabela">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as tabelas</SelectItem>
              {AUDIT_TABLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actor} onValueChange={(value) => value && setActor(value)}>
            <SelectTrigger size="sm" className="w-40" aria-label="Filtrar por usuário">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os usuários</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name ?? p.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={entries.length === 0}>
            <Download /> Exportar CSV
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {entries.length === 0 && !loading && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma alteração encontrada.
          </p>
        )}

        {entries.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ação</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>ID do registro</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const isExpanded = expanded === entry.id;
                const fields = changedFields(entry);
                return (
                  <Fragment key={entry.id}>
                    <TableRow
                      className="cursor-pointer"
                      aria-expanded={isExpanded}
                      onClick={() => setExpanded(isExpanded ? null : entry.id)}
                    >
                      <TableCell>
                        <Badge variant="outline" className={ACTION_BADGE[entry.action] ?? ""}>
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="max-w-40 truncate"
                        title={entry.actor_name ?? entry.actor_email ?? undefined}
                      >
                        {entry.actor_name ?? entry.actor_email ?? "Alguém"}
                      </TableCell>
                      <TableCell className="whitespace-normal">{describeAuditEntry(entry)}</TableCell>
                      <TableCell
                        className="font-mono text-xs text-muted-foreground"
                        title={entry.record_id ?? undefined}
                      >
                        {entry.record_id ? entry.record_id.slice(0, 8) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={5} className="whitespace-normal bg-muted/30">
                          {fields.length > 0 && (
                            <p className="mb-1.5 text-xs text-muted-foreground">
                              Campos alterados: {fields.join(", ")}
                            </p>
                          )}
                          <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
                            {JSON.stringify(entry.diff, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}

        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
              {loading ? "Carregando..." : "Carregar mais"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
