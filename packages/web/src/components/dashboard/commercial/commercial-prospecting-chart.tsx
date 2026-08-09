"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { buildDailyProspectingChart } from "@/services/commercial-dashboard";

export function prospectingSeriesColor(index: number, total: number) {
  return `hsl(${Math.round(index * 360 / Math.max(total, 1))} 70% 45%)`;
}

export function CommercialProspectingChart({ data }: {
  data: ReturnType<typeof buildDailyProspectingChart>;
}) {
  const summaryId = useId();
  const rows = data.days.map((item) => ({ label: item.label, ...item.counts }));

  return <Card>
    <CardHeader>
      <CardTitle>Prospecções por dia</CardTitle>
      <CardDescription>Últimos 14 dias — comparação entre analistas com Prospecção ativa.</CardDescription>
    </CardHeader>
    <CardContent>
      {data.series.length === 0
        ? <p className="py-16 text-center text-sm text-muted-foreground">Nenhum analista com a etapa Prospecção atribuída.</p>
        : <>
          <div role="img" aria-describedby={summaryId} aria-label={`Gráfico de prospecções diárias de ${data.series.map((item) => item.name).join(" e ")}`}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={rows} margin={{ top: 8, right: 12, left: -16, bottom: 4 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                  labelFormatter={(label) => `Data: ${label}`}
                  formatter={(value, name) => [Number(value), data.series.find((item) => item.id === name)?.name ?? name]}
                />
                <Legend formatter={(value) => data.series.find((item) => item.id === value)?.name ?? value} />
                {data.series.map((item, index) => <Bar
                  key={item.id}
                  dataKey={item.id}
                  fill={prospectingSeriesColor(index, data.series.length)}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={34}
                />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table id={summaryId} className="sr-only">
            <caption>Resumo diário das prospecções por analista</caption>
            <thead><tr><th>Data</th>{data.series.map((item) => <th key={item.id}>{item.name}</th>)}</tr></thead>
            <tbody>{data.days.map((day) => <tr key={day.date}><th>{day.label}</th>{data.series.map((item) => <td key={item.id}>{day.counts[item.id] ?? 0}</td>)}</tr>)}</tbody>
          </table>
        </>}
    </CardContent>
  </Card>;
}
