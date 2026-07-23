import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Recommendation } from "@/services/insights";

const PRIORITY_CONFIG: Record<Recommendation["priority"], { label: string; badge: string }> = {
  alta: { label: "Alta", badge: "bg-red-100 text-red-700 border-red-200" },
  media: { label: "Média", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  baixa: { label: "Baixa", badge: "bg-blue-100 text-blue-700 border-blue-200" },
};

export function RecommendationsPanel({ items }: { items: Recommendation[] }) {
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-blue-50/60 to-transparent p-6 dark:from-blue-950/20">
      <div className="mb-3 flex items-center gap-2 text-blue-600">
        <Sparkles className="h-4 w-4" />
        <span className="text-xs font-semibold tracking-wide uppercase">
          Recomendações — o que fazer hoje
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-base text-muted-foreground">
          Nenhuma ação prioritária identificada agora — carteira estável.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-3 text-base leading-relaxed">
              <Badge variant="outline" className={`shrink-0 ${PRIORITY_CONFIG[item.priority].badge}`}>
                {PRIORITY_CONFIG[item.priority].label}
              </Badge>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
