"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TopicsChart({ data }: { data: { topic: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Principais Temas</CardTitle>
        <CardDescription>Assuntos mais recorrentes nas interações</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem interações registradas ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis type="category" dataKey="topic" tick={{ fontSize: 11 }} width={110} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#2563eb" barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
