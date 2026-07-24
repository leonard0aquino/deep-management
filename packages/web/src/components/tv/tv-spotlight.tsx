"use client";

import { useEffect, useState } from "react";
import { STATUS_CONFIG, formatRecency } from "@/lib/status";
import { TV_STATUS_TEXT } from "@/lib/tv-status";
import type { ClientProductMatrixRow } from "@/lib/types/database";

const ROTATE_MS = 5000;

export function TvSpotlight({ items }: { items: ClientProductMatrixRow[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => setIndex((i) => (i + 1) % items.length), ROTATE_MS);
    return () => clearInterval(interval);
  }, [items]);

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">Nenhum relacionamento para destacar.</p>;
  }

  const item = items[index % items.length];
  const status = STATUS_CONFIG[item.status];

  return (
    <div className="flex flex-col items-center justify-center gap-1 py-4 text-center">
      <p className="text-2xl font-bold text-white">{item.product_name}</p>
      <p className="text-base text-slate-400">{item.client_name}</p>
      <p className={`mt-2 text-6xl font-black tabular-nums ${TV_STATUS_TEXT[item.status]}`}>
        {item.composite_score}
      </p>
      <p className="text-xs tracking-wide text-slate-500 uppercase">
        {status.label} · {formatRecency(item.days_since_contact)} sem contato
      </p>
      {items.length > 1 && (
        <div className="mt-3 flex gap-1.5">
          {items.map((dotItem, i) => (
            <span
              key={dotItem.client_id + dotItem.product_id}
              className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-white" : "bg-slate-700"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
