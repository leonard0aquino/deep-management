import {
  Users,
  Phone,
  Mail,
  MessageCircle,
  MessageSquare,
  Ticket,
  MonitorPlay,
  Rocket,
  GraduationCap,
  AlertTriangle,
  FlagOff,
  Circle,
  type LucideIcon,
} from "lucide-react";
import type { InteractionType } from "@/lib/types/database";

export const INTERACTION_TYPE_CONFIG: Record<
  InteractionType,
  { label: string; icon: LucideIcon; tone: string }
> = {
  meeting: { label: "Reunião", icon: Users, tone: "text-blue-600 bg-blue-50" },
  call: { label: "Ligação", icon: Phone, tone: "text-cyan-600 bg-cyan-50" },
  email: { label: "Email", icon: Mail, tone: "text-slate-600 bg-slate-100" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, tone: "text-emerald-600 bg-emerald-50" },
  teams: { label: "Contato no Teams", icon: MessageSquare, tone: "text-purple-600 bg-purple-50" },
  ticket: { label: "Ticket", icon: Ticket, tone: "text-orange-600 bg-orange-50" },
  demo: { label: "Demo", icon: MonitorPlay, tone: "text-violet-600 bg-violet-50" },
  implantacao: { label: "Implantação", icon: Rocket, tone: "text-blue-600 bg-blue-50" },
  treinamento: { label: "Treinamento", icon: GraduationCap, tone: "text-indigo-600 bg-indigo-50" },
  incidente: { label: "Incidente", icon: AlertTriangle, tone: "text-red-600 bg-red-50" },
  encerramento: { label: "Encerramento", icon: FlagOff, tone: "text-slate-600 bg-slate-100" },
  other: { label: "Outro", icon: Circle, tone: "text-muted-foreground bg-muted" },
};
