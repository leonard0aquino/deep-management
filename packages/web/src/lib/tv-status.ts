import type { RelationshipStatus } from "@/lib/types/database";

export const TV_STATUS_CELL: Record<RelationshipStatus, string> = {
  recente: "bg-emerald-950/60 border-emerald-800 text-emerald-300",
  ok: "bg-emerald-950/30 border-emerald-900 text-emerald-400",
  atencao: "bg-amber-950/50 border-amber-800 text-amber-300",
  alerta: "bg-orange-950/50 border-orange-800 text-orange-300",
  critico: "bg-red-950/60 border-red-800 text-red-300",
};

export const TV_STATUS_TEXT: Record<RelationshipStatus, string> = {
  recente: "text-emerald-400",
  ok: "text-emerald-300",
  atencao: "text-amber-300",
  alerta: "text-orange-300",
  critico: "text-red-400",
};
