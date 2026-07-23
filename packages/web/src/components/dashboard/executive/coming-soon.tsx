import type { LucideIcon } from "lucide-react";
import { PageTopbar } from "./page-topbar";

export function ComingSoon({
  title,
  description,
  icon: Icon,
  phase,
  phaseDescription,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  phase: string;
  phaseDescription: string;
}) {
  return (
    <div>
      <PageTopbar title={title} description={description} />
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Icon className="h-7 w-7" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          Planejado para a {phase}
        </p>
        <p className="max-w-md text-sm text-muted-foreground">{phaseDescription}</p>
      </div>
    </div>
  );
}
