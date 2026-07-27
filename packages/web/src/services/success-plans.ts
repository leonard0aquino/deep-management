import type {
  ClientSuccessMilestone,
  SuccessMilestoneStatus,
  SuccessPlanStatus,
} from "@/lib/types/database";

export const SUCCESS_PLAN_STATUS: Record<
  SuccessPlanStatus,
  { label: string; badge: string }
> = {
  rascunho: { label: "Rascunho", badge: "border-slate-200 bg-slate-100 text-slate-700" },
  ativo: { label: "Ativo", badge: "border-blue-200 bg-blue-100 text-blue-700" },
  concluido: { label: "Concluído", badge: "border-emerald-200 bg-emerald-100 text-emerald-700" },
  cancelado: { label: "Cancelado", badge: "border-zinc-200 bg-zinc-100 text-zinc-600" },
};

export const SUCCESS_MILESTONE_STATUS: Record<
  SuccessMilestoneStatus,
  { label: string; badge: string }
> = {
  pendente: { label: "Pendente", badge: "border-amber-200 bg-amber-50 text-amber-700" },
  em_andamento: { label: "Em andamento", badge: "border-blue-200 bg-blue-50 text-blue-700" },
  concluido: { label: "Concluído", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  cancelado: { label: "Cancelado", badge: "border-zinc-200 bg-zinc-50 text-zinc-600" },
};

export function calculateSuccessPlanProgress(
  milestones: Pick<ClientSuccessMilestone, "status">[],
): number {
  const validMilestones = milestones.filter((milestone) => milestone.status !== "cancelado");
  if (validMilestones.length === 0) return 0;

  const completed = validMilestones.filter((milestone) => milestone.status === "concluido").length;
  return Math.round((completed / validMilestones.length) * 100);
}
