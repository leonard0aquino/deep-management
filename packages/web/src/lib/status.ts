import type { RelationshipStatus } from "@/lib/types/database";

export const STATUS_CONFIG: Record<
  RelationshipStatus,
  { label: string; badge: string; dot: string; cell: string; points: number }
> = {
  recente: {
    label: "Recente",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    cell: "bg-emerald-50 border-emerald-200 text-emerald-700",
    points: 100,
  },
  ok: {
    label: "OK",
    badge: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
    cell: "bg-green-50 border-green-200 text-green-700",
    points: 80,
  },
  atencao: {
    label: "Atenção",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    cell: "bg-amber-50 border-amber-200 text-amber-700",
    points: 55,
  },
  alerta: {
    label: "Alerta",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
    cell: "bg-orange-50 border-orange-200 text-orange-700",
    points: 30,
  },
  critico: {
    label: "Crítico",
    badge: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
    cell: "bg-red-50 border-red-200 text-red-700",
    points: 10,
  },
};

export function formatRecency(days: number): string {
  if (days <= 0) return "hoje";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}m`;
  return `${Math.round(days / 365)}a`;
}

export function scoreLabel(score: number): string {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Bom";
  if (score >= 50) return "Atenção";
  return "Crítico";
}

export function scoreToneClass(score: number): string {
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-green-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}
