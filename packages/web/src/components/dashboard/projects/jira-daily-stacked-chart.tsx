"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildJiraDailyStackedChart, type JiraDailyActivity } from "@/services/jira-import";

const sourceDate = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const SERIES_COLORS = ["#4f46e5", "#0891b2", "#16a34a", "#d97706", "#db2777", "#7c3aed"];

type ChartRow = {
  date: string;
  label: string;
  total: number;
  [key: string]: string | number;
};

function seriesColor(index: number, isOthers: boolean) {
  return isOthers ? "#64748b" : SERIES_COLORS[index % SERIES_COLORS.length];
}

export function JiraDailyStackedChart({ activityByDay }: { activityByDay: JiraDailyActivity[] }) {
  const summaryId = useId();
  const chart = buildJiraDailyStackedChart(activityByDay);
  const rows: ChartRow[] = chart.days.map((day) => ({
    ...day.counts,
    date: day.date,
    label: sourceDate.format(new Date(`${day.date}T12:00:00Z`)),
    total: day.total,
  }));
  const hasOthers = chart.series.some((item) => item.id === "__others__");

  return <Card>
    <CardHeader>
      <CardTitle role="heading" aria-level={2}>Por dia</CardTitle>
      <CardDescription>
        Cards pela data da última atualização recebida do Jira, separados por responsável.
        {hasOthers ? " Os menores volumes estão consolidados em Outros." : ""} É um snapshot de volume, não uma medição de produtividade.
      </CardDescription>
    </CardHeader>
    <CardContent>
      {chart.days.length === 0
        ? <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma atualização com data para os filtros atuais.</p>
        : <>
          <div
            role="img"
            aria-describedby={summaryId}
            aria-label="Gráfico consolidado de atualizações do Jira por dia e responsável"
          >
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={rows} margin={{ top: 28, right: 12, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                  labelFormatter={(label) => `Data: ${label}`}
                  formatter={(value, name) => [Number(value), chart.series.find((item) => item.id === name)?.name ?? name]}
                />
                <Legend formatter={(value) => chart.series.find((item) => item.id === value)?.name ?? value} />
                {chart.series.map((item, index) => <Bar
                  key={item.id}
                  dataKey={item.id}
                  stackId="daily"
                  fill={seriesColor(index, item.id === "__others__")}
                  maxBarSize={56}
                  radius={index === chart.series.length - 1 ? [4, 4, 0, 0] : 0}
                >
                  {index === chart.series.length - 1 && <LabelList dataKey="total" position="top" className="fill-foreground text-xs font-semibold" />}
                </Bar>)}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table id={summaryId} className="sr-only">
            <caption>Resumo consolidado de atualizações por dia e responsável</caption>
            <thead><tr><th>Data</th>{chart.series.map((item) => <th key={item.id}>{item.name}</th>)}<th>Total</th></tr></thead>
            <tbody>{rows.map((day) => <tr key={day.date}><th>{day.label}</th>{chart.series.map((item) => <td key={item.id}>{Number(day[item.id] ?? 0)}</td>)}<td>{day.total}</td></tr>)}</tbody>
          </table>
        </>}
    </CardContent>
  </Card>;
}
