import type { CustomerSentiment, StakeholderInfluence, StakeholderRelationshipRole, StakeholderRisk } from "@/lib/types/database";

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

export const RELATIONSHIP_ROLE_CONFIG: Record<StakeholderRelationshipRole, { label: string; shortLabel: string }> = {
  patrocinador: { label: "Patrocinador", shortLabel: "Patrocinador" },
  decisor: { label: "Decisor", shortLabel: "Decisor" },
  influenciador: { label: "Influenciador", shortLabel: "Influenciador" },
  usuario_chave: { label: "Usuário-chave", shortLabel: "Usuário-chave" },
  contato_operacional: { label: "Contato operacional", shortLabel: "Operacional" },
  detrator: { label: "Detrator ou resistência", shortLabel: "Detrator" },
};

export const CUSTOMER_SENTIMENT_CONFIG: Record<CustomerSentiment, { label: string; badge: string }> = {
  positive: { label: "Sentimento positivo", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  neutral: { label: "Sentimento neutro", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  negative: { label: "Sentimento negativo", badge: "bg-red-100 text-red-700 border-red-200" },
};
