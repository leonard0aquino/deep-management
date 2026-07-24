import { formatRecency } from "@/lib/status";
import type { InteractionView } from "@/lib/types/database";

export function TvRecentActivity({ interactions }: { interactions: InteractionView[] }) {
  const recent = interactions.slice(0, 3);

  if (recent.length === 0) {
    return <p className="text-sm text-slate-500">Nenhuma interação registrada.</p>;
  }

  return (
    <div className="space-y-3">
      {recent.map((row) => (
        <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold text-white">
              {row.client_name} · {row.product_name}
            </p>
            <span className="shrink-0 text-xs text-slate-500">{formatRecency(row.days_since_contact)}</span>
          </div>
          <p className="mt-1 truncate text-sm text-slate-400">{row.topic}</p>
        </div>
      ))}
    </div>
  );
}
