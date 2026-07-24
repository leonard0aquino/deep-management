"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { generateApiKey } from "@/app/(app)/admin/actions";
import type { ApiKey } from "@/lib/types/database";

export function ApiKeysManagement({ apiKeys }: { apiKeys: ApiKey[] }) {
  const router = useRouter();
  const [list, setList] = useState(apiKeys);
  const [label, setLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    setNewKey(null);
    startTransition(async () => {
      const result = await generateApiKey(label || "Sem nome");
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewKey(result.data);
      setLabel("");
      router.refresh();
    });
  }

  async function revoke(id: string) {
    const supabase = createClient();
    const { error: dbError } = await supabase.from("api_keys").update({ revoked: true }).eq("id", id);
    if (!dbError) {
      setList((prev) => prev.map((k) => (k.id === id ? { ...k, revoked: true } : k)));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API</CardTitle>
        <CardDescription>Chaves para integração com sistemas externos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {newKey && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <p className="font-medium text-emerald-800">
              Copie agora — a chave não será mostrada de novo:
            </p>
            <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-xs">{newKey}</code>
          </div>
        )}
        {list.map((key) => (
          <div key={key.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{key.label}</p>
              <p className="truncate text-xs text-muted-foreground">{key.key_prefix}…</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {key.revoked ? (
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                  Revogada
                </Badge>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => revoke(key.id)}>
                  Revogar
                </Button>
              )}
            </div>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <Input placeholder="Nome da chave" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Button onClick={handleGenerate} disabled={isPending} className="shrink-0">
            {isPending ? "Gerando..." : "Gerar chave"}
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
