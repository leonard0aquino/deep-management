"use client";

import { Pause, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function PageTopbar({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  const { minutes, seconds, lastUpdatedAt, paused, isRefreshing, refreshNow } = useAutoRefresh(300);
  const date = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="flex min-h-[62px] flex-wrap items-center justify-between gap-3 border-b bg-white px-5 py-3 print:hidden sm:px-7">
      <div>
        <h1 className="text-[14px] font-medium tracking-tight">{title}</h1>
        <p className="mt-0.5 text-[11px] text-muted-foreground capitalize">{description || date}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="hidden gap-1.5 rounded-lg bg-white text-[11px] font-normal text-muted-foreground md:flex" aria-live="polite">
          {paused ? <Pause className="h-3 w-3" aria-hidden="true" /> : <RefreshCw className="h-3 w-3" aria-hidden="true" />}
          {paused ? "Atualização pausada" : `Atualiza em ${minutes}m ${seconds.toString().padStart(2, "0")}s`}
        </Badge>
        <span className="hidden text-[10px] text-muted-foreground xl:inline">Atualizado às {lastUpdatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
        <Button variant="ghost" size="icon" onClick={refreshNow} disabled={isRefreshing} aria-label="Atualizar dados agora" title="Atualizar dados agora">
          <RefreshCw className={isRefreshing ? "animate-spin" : ""} aria-hidden="true" />
        </Button>
        <NotificationBell />
        {children}
      </div>
    </header>
  );
}
