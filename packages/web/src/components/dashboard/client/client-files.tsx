import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Paperclip } from "lucide-react";
import type { InteractionView } from "@/lib/types/database";

export function ClientFiles({ interactions }: { interactions: InteractionView[] }) {
  const files = interactions.flatMap((i) =>
    (i.links ?? []).map((link) => ({ ...link, occurredAt: i.occurred_at, topic: i.topic })),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Arquivos</CardTitle>
        <CardDescription>Links e documentos anexados às interações</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {files.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum arquivo ou link anexado ainda.
          </p>
        )}
        {files.map((file, index) => (
          <a
            key={`${file.url}-${index}`}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg p-2 text-sm transition-colors hover:bg-muted/60"
          >
            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-blue-600 underline">{file.label}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">{file.topic}</span>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
