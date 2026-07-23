"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { NamedScore } from "@/services/analytics";

function colorForScore(score: number): string {
  if (score >= 85) return "#059669";
  if (score >= 70) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

export function HorizontalBarChart({
  title,
  description,
  data,
  height = 280,
}: {
  title: string;
  description?: string;
  data: NamedScore[];
  height?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem dados suficientes ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(height, data.length * 32)}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip />
              <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={16}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={colorForScore(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
