"use client";

import { useAutoRefresh } from "@/hooks/use-auto-refresh";

export function TvHeaderClock() {
  const { minutes, seconds, lastUpdatedAt } = useAutoRefresh(30);

  return (
    <div className="text-right">
      <p className="text-2xl font-semibold tabular-nums text-slate-300">
        Atualizado às{" "}
        {lastUpdatedAt.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </p>
      <p className="text-sm text-slate-500">
        Próxima atualização em {minutes}m {seconds.toString().padStart(2, "0")}s
      </p>
    </div>
  );
}
