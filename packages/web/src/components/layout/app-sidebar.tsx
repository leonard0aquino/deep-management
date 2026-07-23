"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  UserRound,
  ChevronsUpDown,
} from "lucide-react";
import { logout } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/lib/types/database";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  analista: "Analista",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const NAV_ITEMS = [
  { href: "/", label: "Cockpit Executivo", icon: LayoutDashboard },
  { href: "/analytics", label: "Dashboards", icon: BarChart3 },
  { href: "/activity", label: "Atividade", icon: Clock },
  { href: "/accounts", label: "Carteira", icon: Users },
  { href: "/products", label: "Produtos", icon: Package },
  { href: "/people", label: "Pessoas", icon: UserRound },
  { href: "/admin", label: "Configurações", icon: Settings },
] as const;

export function AppSidebar({
  userEmail,
  userName,
  userRole,
}: {
  userEmail: string;
  userName: string | null;
  userRole: UserRole;
}) {
  const pathname = usePathname();
  const displayName = userName?.trim() || userEmail;

  return (
    <aside className="sticky top-0 z-30 flex h-screen w-16 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:w-[216px]">
      <div className="flex h-[62px] items-center justify-center border-b border-sidebar-border px-2 lg:px-4">
        <div className="relative h-5 w-12 lg:h-9 lg:w-40">
          <Image src="/logo-deep-slogan.png" alt="DEEP — Turn-on Data" fill priority sizes="(min-width: 1024px) 160px, 48px" className="object-contain object-center" />
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3 lg:px-2.5">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={cn(
                "flex items-center justify-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-colors lg:justify-start",
                active
                  ? "bg-slate-950 text-white font-medium shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-[15px] w-[15px] shrink-0" />
              <span className="hidden truncate lg:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-2.5 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Abrir menu do usuário ${displayName}`}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent/60 lg:justify-start"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              {initials(displayName)}
            </div>
            <div className="hidden min-w-0 flex-1 lg:block">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{displayName}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">{ROLE_LABEL[userRole]}</p>
            </div>
            <ChevronsUpDown className="hidden h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50 lg:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52">
            <form action={logout} className="w-full">
              <DropdownMenuItem
                variant="destructive"
                nativeButton
                render={<button type="submit" className="w-full" />}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
