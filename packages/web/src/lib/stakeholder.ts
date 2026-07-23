import type { StakeholderInfluence, StakeholderRisk } from "@/lib/types/database";

export const INFLUENCE_CONFIG: Record<StakeholderInfluence, { label: string; badge: string }> = {
  baixa: { label: "Baixa influência", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  media: { label: "Média influência", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  alta: { label: "Alta influência", badge: "bg-violet-100 text-violet-700 border-violet-200" },
};

export const RISK_CONFIG: Record<StakeholderRisk, { label: string; badge: string; dot: string }> = {
  baixo: { label: "Risco baixo", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  medio: { label: "Risco médio", badge: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  alto: { label: "Risco alto", badge: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
};
