import { Sparkles } from "lucide-react";
import type { BriefingItem } from "@/services/insights";

const TONE_DOT: Record<BriefingItem["tone"], string> = {
  positive: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  opportunity: "bg-blue-500",
};

export function ClientBriefing({ items }: { items: BriefingItem[] }) {
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-blue-50/60 to-transparent p-6 dark:from-blue-950/20">
      <div className="mb-3 flex items-center gap-2 text-blue-600">
        <Sparkles className="h-4 w-4" />
        <span className="text-xs font-semibold tracking-wide uppercase">Resumo Executivo IA</span>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2.5 text-base leading-relaxed">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} />
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
