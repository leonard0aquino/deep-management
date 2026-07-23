"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { INTERACTION_TYPE_CONFIG } from "@/lib/interaction-type";
import type { TypeCount } from "@/services/analytics";

const TYPE_COLORS: Record<string, string> = {
  meeting: "#2563eb",
  call: "#0891b2",
  email: "#64748b",
  whatsapp: "#059669",
  ticket: "#ea580c",
  demo: "#7c3aed",
  implantacao: "#2563eb",
  treinamento: "#4f46e5",
  incidente: "#dc2626",
  encerramento: "#64748b",
  other: "#94a3b8",
};

export function InteractionTypeChart({ data }: { data: TypeCount[] }) {
  const chartData = data.map((d) => ({
    name: INTERACTION_TYPE_CONFIG[d.type].label,
    count: d.count,
    type: d.type,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Interações por Tipo</CardTitle>
        <CardDescription>Volume por canal de contato</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem interações registradas ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.type} fill={TYPE_COLORS[entry.type]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
