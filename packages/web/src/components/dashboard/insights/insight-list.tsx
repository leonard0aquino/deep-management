import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function InsightList({
  title,
  description,
  icon: Icon,
  iconTone,
  emptyLabel,
  items,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  iconTone: string;
  emptyLabel: string;
  items: { key: string; href?: string; primary: string; secondary?: string; badge?: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 text-base ${iconTone}`}>
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {items.length === 0 && <p className="text-sm text-muted-foreground">{emptyLabel}</p>}
        {items.map((item) => {
          const content = (
            <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/60">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.primary}</p>
                {item.secondary && (
                  <p className="truncate text-xs text-muted-foreground">{item.secondary}</p>
                )}
              </div>
              {item.badge && (
                <span className="shrink-0 text-xs text-muted-foreground">{item.badge}</span>
              )}
            </div>
          );
          return item.href ? (
            <Link key={item.key} href={item.href}>
              {content}
            </Link>
          ) : (
            <div key={item.key}>{content}</div>
          );
        })}
      </CardContent>
    </Card>
  );
}
