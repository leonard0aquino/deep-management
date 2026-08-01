import type { RelationshipStatus } from "@/lib/types/database";

export const TV_STATUS_CELL: Record<RelationshipStatus, string> = {
  recente: "tv-status-recente",
  ok: "tv-status-ok",
  atencao: "tv-status-atencao",
  alerta: "tv-status-alerta",
  critico: "tv-status-critico",
};

export const TV_STATUS_TEXT: Record<RelationshipStatus, string> = {
  recente: "tv-status-text-recente",
  ok: "tv-status-text-ok",
  atencao: "tv-status-text-atencao",
  alerta: "tv-status-text-alerta",
  critico: "tv-status-text-critico",
};
