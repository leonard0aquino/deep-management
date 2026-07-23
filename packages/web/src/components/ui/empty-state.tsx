import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  compact = false,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-10"}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <p className="mt-3 text-[12px] font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-[11px] text-muted-foreground">{description}</p>
    </div>
  );
}
