import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import type { InteractionView } from "@/lib/types/database";

export function ProductEvents({
  title,
  description,
  icon: Icon,
  events,
  emptyLabel,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  events: InteractionView[];
  emptyLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.length === 0 && <p className="text-sm text-muted-foreground">{emptyLabel}</p>}
        {events.map((event) => (
          <div key={event.id} className="flex items-center justify-between text-sm">
            <span>
              {event.client_name} · {event.topic}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(event.occurred_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
