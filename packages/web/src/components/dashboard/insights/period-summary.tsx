import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BriefingItem } from "@/services/insights";

const TONE_DOT: Record<BriefingItem["tone"], string> = {
  positive: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  opportunity: "bg-blue-500",
};

export function PeriodSummary({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: BriefingItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} />
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
