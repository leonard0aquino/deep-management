import { Sparkles } from "lucide-react";
import type { BriefingItem } from "@/services/insights";

const TONE_DOT: Record<BriefingItem["tone"], string> = {
  positive: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  opportunity: "bg-blue-500",
};

function firstName(emailLocalPart: string): string {
  return emailLocalPart.split(/[.\s_+]/)[0] ?? emailLocalPart;
}

export function ExecutiveBriefing({
  items,
  userEmail,
}: {
  items: BriefingItem[];
  userEmail: string;
}) {
  const name = firstName(userEmail.split("@")[0] ?? "");
  const capitalized = name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <section className="min-h-[310px] rounded-xl border bg-white p-5 shadow-none dark:bg-card">
      <div className="mb-3 flex items-center gap-2 text-blue-600">
        <Sparkles className="h-4 w-4" />
        <span className="text-[12px] font-semibold">Inteligência Comportamental</span>
      </div>
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        {greeting}
        {capitalized ? `, ${capitalized}` : ""}. Desde o seu último acesso:
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2.5 rounded-lg border bg-muted/25 p-3 text-[12px] leading-relaxed">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} />
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
